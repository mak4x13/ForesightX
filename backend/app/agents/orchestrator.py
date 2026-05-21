import json

from app.agents.common import Emit, call_gemini_json, emit_text
from app.models.schemas import SimulationRequest
from app.tools.decision_tools import (
    analyze_decision_context,
    coerce_string_list,
    fallback_briefing,
)


async def run_orchestrator(payload: SimulationRequest, emit: Emit) -> dict:
    await emit(
        {
            "event": "agent_status",
            "agent": "orchestrator",
            "status": "thinking",
            "message": "Parsing your scenario and extracting decision variables...",
        }
    )
    tool_result = analyze_decision_context(
        payload.situation, payload.decision, payload.domain
    )
    prompt = f"""
You are AGENT 1 - ORCHESTRATOR for ForesightX.
Use the analyze_decision_context tool result below as the factual base.
Return only JSON with keys: variables, context, analogies, constraints.

Situation: {payload.situation}
Decision: {payload.decision}
Domain: {payload.domain}
analyze_decision_context result: {json.dumps(tool_result)}
"""
    try:
        briefing = await call_gemini_json(prompt)
    except Exception as exc:
        briefing = fallback_briefing(payload.situation, payload.decision, payload.domain)
        await emit(
            {
                "event": "error",
                "agent": "orchestrator",
                "message": str(exc),
                "fallback": True,
            }
        )

    if not isinstance(briefing, dict):
        briefing = fallback_briefing(payload.situation, payload.decision, payload.domain)

    context = briefing.get("context")
    if not isinstance(context, dict):
        context = {"summary": str(context or "")}
    briefing["context"] = context
    briefing["context"].setdefault("domain", payload.domain)
    briefing["context"].setdefault("situation", payload.situation)
    briefing["context"].setdefault("decision", payload.decision)
    briefing["variables"] = coerce_string_list(
        briefing.get("variables"), tool_result["variables"]
    )
    briefing["analogies"] = coerce_string_list(
        briefing.get("analogies"), tool_result["analogies"]
    )
    briefing["constraints"] = coerce_string_list(
        briefing.get("constraints"), tool_result["constraints"]
    )
    briefing.pop("_model", None)

    await emit_text(
        "orchestrator",
        "Briefing created: variables, assumptions, constraints, and analogies mapped.",
        emit,
    )
    await emit(
        {
            "event": "agent_status",
            "agent": "orchestrator",
            "status": "done",
            "message": "Structured briefing ready.",
        }
    )
    return briefing
