import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from app.core.config import settings


Emit = Callable[[dict], Awaitable[None]]

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)
GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-1.5-flash"


async def emit_text(agent: str, text: str, emit: Emit, delay: float = 0.006) -> None:
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

    async with httpx.AsyncClient(timeout=40) as client:
        response = await client.post(
            GEMINI_URL,
            params={"key": settings.gemini_api_key},
            json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "responseMimeType": "application/json",
                },
            },
        )
        response.raise_for_status()
        payload = response.json()

    text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return extract_json_object(text)


async def call_groq_tool_json(
    *,
    system_prompt: str,
    user_payload: dict[str, Any],
    tools: list[dict[str, Any]],
    tool_handlers: dict[str, Callable[..., Any]],
    fallback_tool_args: dict[str, Any],
) -> dict[str, Any]:
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_payload)},
    ]

    async with httpx.AsyncClient(timeout=60) as client:
        first = await client.post(
            GROQ_URL,
            headers=headers,
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "tools": tools,
                "tool_choice": "auto",
                "temperature": 0.35,
            },
        )
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

        final = await client.post(
            GROQ_URL,
            headers=headers,
            json={
                "model": GROQ_MODEL,
                "messages": messages
                + [
                    {
                        "role": "user",
                        "content": "Return only the required JSON object. No markdown.",
                    }
                ],
                "temperature": 0.35,
                "response_format": {"type": "json_object"},
            },
        )
        final.raise_for_status()
        content = final.json()["choices"][0]["message"]["content"]
        return extract_json_object(content)
