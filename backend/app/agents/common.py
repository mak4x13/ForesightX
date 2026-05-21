import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from app.core.config import settings


Emit = Callable[[dict], Awaitable[None]]

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GROQ_MODEL = settings.groq_model
GEMINI_MODEL = settings.gemini_model


def _groq_models() -> list[str]:
    models = [settings.groq_model]
    for model in settings.groq_fallback_models:
        if model not in models:
            models.append(model)
    return models


async def emit_text(agent: str, text: str, emit: Emit, delay: float = 0.006) -> None:
    if not isinstance(text, str):
        text = json.dumps(text)
    for index in range(0, len(text), 28):
        await emit({"event": "agent_output", "agent": agent, "chunk": text[index : index + 28]})
        await asyncio.sleep(delay)


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(cleaned[start : end + 1])


async def call_gemini_json(prompt: str) -> dict[str, Any]:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    models = [settings.gemini_model]
    for model in settings.gemini_fallback_models:
        if model not in models:
            models.append(model)

    last_error = None
    async with httpx.AsyncClient(timeout=40) as client:
        for model in models:
            response = await client.post(
                f"{GEMINI_BASE_URL}/{model}:generateContent",
                params={"key": settings.gemini_api_key},
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "responseMimeType": "application/json",
                    },
                },
            )
            if response.status_code == 404:
                last_error = RuntimeError(f"Gemini model {model} is unavailable.")
                continue
            try:
                response.raise_for_status()
                payload = response.json()
                text = payload["candidates"][0]["content"]["parts"][0]["text"]
                result = extract_json_object(text)
                result["_model"] = model
                return result
            except Exception as exc:
                last_error = exc
                continue

    raise RuntimeError(f"Gemini call failed for all configured models: {last_error}")


async def call_groq_tool_json(
    *,
    system_prompt: str,
    user_payload: dict[str, Any],
    tools: list[dict[str, Any]],
    tool_handlers: dict[str, Callable[..., Any]],
    fallback_tool_args: dict[str, Any],
    api_key: str = "",
) -> dict[str, Any]:
    key = api_key or settings.groq_api_key
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_payload)},
    ]

    async with httpx.AsyncClient(timeout=60) as client:
        first = None
        for model in _groq_models():
            first = await client.post(
                GROQ_URL,
                headers=headers,
                json={
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.35,
                },
            )
            if first.status_code != 429:
                break
        first.raise_for_status()
        first_message = first.json()["choices"][0]["message"]
        messages.append(first_message)

        tool_calls = first_message.get("tool_calls") or []
        if not tool_calls and tools:
            name = tools[0]["function"]["name"]
            result = tool_handlers[name](**fallback_tool_args)
            messages.append(
                {
                    "role": "user",
                    "content": f"{name} returned this JSON: {json.dumps(result)}",
                }
            )

        for tool_call in tool_calls:
            function = tool_call["function"]
            name = function["name"]
            arguments = json.loads(function.get("arguments") or "{}")
            result = tool_handlers[name](**arguments)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": name,
                    "content": json.dumps(result),
                }
            )

        final_payload = {
            "model": settings.groq_model,
            "messages": messages
            + [
                {
                    "role": "user",
                    "content": "Return only the required JSON object. No markdown.",
                }
            ],
            "temperature": 0.35,
            "response_format": {"type": "json_object"},
        }
        final = None
        for model in _groq_models():
            final_payload["model"] = model
            final = await client.post(GROQ_URL, headers=headers, json=final_payload)
            if final.status_code == 400:
                retry_payload = {key: value for key, value in final_payload.items() if key != "response_format"}
                final = await client.post(GROQ_URL, headers=headers, json=retry_payload)
            if final.status_code != 429:
                break
        final.raise_for_status()
        content = final.json()["choices"][0]["message"]["content"]
        return extract_json_object(content)


async def call_groq_json(
    *, system_prompt: str, user_payload: dict[str, Any], api_key: str = ""
) -> dict[str, Any]:
    key = api_key or settings.groq_api_key
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_payload)
                + "\nReturn only one valid JSON object. No markdown.",
            },
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = None
        for model in _groq_models():
            payload["model"] = model
            response = await client.post(GROQ_URL, headers=headers, json=payload)
            if response.status_code == 400:
                retry_payload = {key: value for key, value in payload.items() if key != "response_format"}
                response = await client.post(GROQ_URL, headers=headers, json=retry_payload)
            if response.status_code != 429:
                break
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return extract_json_object(content)


async def stream_groq_text(
    *,
    system_prompt: str,
    user_payload: dict[str, Any],
    api_key: str = "",
):
    key = api_key or settings.groq_api_key
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
        "temperature": 0.25,
        "max_tokens": 900,
        "stream": True,
    }

    last_error = None
    async with httpx.AsyncClient(timeout=80) as client:
        for model in _groq_models():
            payload["model"] = model
            async with client.stream("POST", GROQ_URL, headers=headers, json=payload) as response:
                if response.status_code == 429:
                    last_error = RuntimeError("Groq rate limit reached.")
                    continue
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line.removeprefix("data:").strip()
                    if data == "[DONE]":
                        return
                    try:
                        chunk = json.loads(data)["choices"][0].get("delta", {}).get("content")
                    except (KeyError, json.JSONDecodeError, IndexError):
                        chunk = None
                    if chunk:
                        yield chunk
                return

    raise RuntimeError(f"Groq streaming failed for all configured models: {last_error}")
