from datetime import datetime, timezone
from uuid import uuid4

from app.agents.common import Emit, call_groq_json, emit_text
from app.core.config import settings
from app.models.schemas import SimulationRequest, SimulationResult
from app.tools.decision_tools import (
    coerce_probability,
    coerce_string_list,
    coerce_text,
    fallback_agent_output,
    flag_logical_inconsistency,
    normalize_milestones,
    score_outcome_probability,
)


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "score_outcome_probability",
            "description": "Normalize outcome probabilities so they sum to 100.",
            "parameters": {
                "type": "object",
                "properties": {
                    "optimist_out": {"type": "object"},
                    "realist_out": {"type": "object"},
                    "pessimist_out": {"type": "object"},
                },
                "required": ["optimist_out", "realist_out", "pessimist_out"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "flag_logical_inconsistency",
            "description": "Find contradictions or missing fields in outcome outputs.",
            "parameters": {
                "type": "object",
                "properties": {"outputs": {"type": "array", "items": {"type": "object"}}},
                "required": ["outputs"],
            },
        },
    },
]


def _shape_result(
    payload: SimulationRequest,
    outputs: dict,
    probabilities: dict,
    execution_time_ms: int,
) -> dict:
    briefing = {
        "context": {
            "decision": payload.decision,
            "situation": payload.situation,
            "domain": payload.domain,
        }
    }
    optimistic = outputs.get("optimistic")
    if not isinstance(optimistic, dict):
        optimistic = {}
    optimistic = {**fallback_agent_output("optimistic", briefing), **optimistic}

    realistic = outputs.get("realistic")
    if not isinstance(realistic, dict):
        realistic = {}
    realistic = {**fallback_agent_output("realistic", briefing), **realistic}

    pessimistic = outputs.get("pessimistic")
    if not isinstance(pessimistic, dict):
        pessimistic = {}
    pessimistic = {**fallback_agent_output("pessimistic", briefing), **pessimistic}

    if not isinstance(probabilities, dict):
        probabilities = {}
    probabilities = {
        "optimistic": coerce_probability(probabilities.get("optimistic"), 35),
        "realistic": coerce_probability(probabilities.get("realistic"), 45),
        "pessimistic": coerce_probability(probabilities.get("pessimistic"), 20),
    }
    drift = 100 - sum(probabilities.values())
    probabilities["realistic"] += drift
    return {
        "simulation_id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc),
        "input": payload.model_dump(),
        "outcomes": {
            "optimistic": {
                "probability": probabilities["optimistic"],
                "label": "OPTIMISTIC",
                "enabling_factors": coerce_string_list(
                    optimistic.get("enabling_factors"), []
                )[:5],
                "milestones": normalize_milestones(optimistic.get("milestones", [])),
                "final_state": coerce_text(optimistic.get("final_state")),
                "emotional_tone": coerce_text(optimistic.get("emotional_tone")),
            },
            "realistic": {
                "probability": probabilities["realistic"],
                "label": "REALISTIC",
                "friction_points": coerce_string_list(
                    realistic.get("friction_points"), []
                )[:5],
                "milestones": normalize_milestones(realistic.get("milestones", [])),
                "trade_offs": coerce_string_list(realistic.get("trade_offs"), [])[:5],
                "final_state": coerce_text(realistic.get("final_state")),
            },
            "pessimistic": {
                "probability": probabilities["pessimistic"],
                "label": "PESSIMISTIC",
                "risk_factors": coerce_string_list(
                    pessimistic.get("risk_factors"), []
                )[:5],
                "milestones": normalize_milestones(pessimistic.get("milestones", [])),
                "failure_triggers": coerce_string_list(
                    pessimistic.get("failure_triggers"), []
                )[:5],
                "final_state": coerce_text(pessimistic.get("final_state")),
                "mitigation": coerce_text(pessimistic.get("mitigation")),
            },
        },
        "meta": {
            "total_agents": 4,
            "execution_time_ms": execution_time_ms,
            "model_orchestrator": settings.gemini_model,
            "model_agents": settings.groq_model,
        },
    }


async def run_synthesizer(
    payload: SimulationRequest,
    outputs: dict,
    execution_time_ms: int,
    emit: Emit,
) -> dict:
    await emit(
        {
            "event": "agent_status",
            "agent": "synthesizer",
            "status": "thinking",
            "message": "Cross-checking outcomes and normalizing probabilities...",
        }
    )
    probabilities = score_outcome_probability(
        outputs["optimistic"], outputs["realistic"], outputs["pessimistic"]
    )
    contradictions = flag_logical_inconsistency(list(outputs.values()))
    system_prompt = """
You are AGENT 5 - SYNTHESIZER AGENT for ForesightX.
Use the provided tools to cross-check consistency and normalize probabilities.
Return JSON with keys probabilities and contradictions. Do not rewrite the outcomes.
"""
    try:
        synthesis = await call_groq_json(
            system_prompt=system_prompt,
            user_payload={
                "outputs": outputs,
                "tool_results": {
                    "probabilities": probabilities,
                    "contradictions": contradictions,
                },
                "instruction": "Return the supplied probabilities and contradictions unless there is an obvious arithmetic or logical issue.",
            },
            api_key=settings.groq_api_key_synthesizer,
        )
        if isinstance(synthesis, dict):
            probabilities = synthesis.get("probabilities", probabilities)
            contradictions = synthesis.get("contradictions", contradictions)
        if set(probabilities) != {"optimistic", "realistic", "pessimistic"}:
            probabilities = score_outcome_probability(
                outputs["optimistic"], outputs["realistic"], outputs["pessimistic"]
            )
    except Exception as exc:
        await emit(
            {
                "event": "error",
                "agent": "synthesizer",
                "message": str(exc),
                "fallback": True,
            }
        )

    try:
        result = _shape_result(payload, outputs, probabilities, execution_time_ms)
        validated = SimulationResult.model_validate(result).model_dump(mode="json")
    except Exception as exc:
        await emit(
            {
                "event": "error",
                "agent": "synthesizer",
                "message": f"Recovered from malformed model output: {exc}",
                "fallback": True,
            }
        )
        safe_outputs = {
            "optimistic": fallback_agent_output(
                "optimistic", {"context": {"decision": payload.decision}}
            ),
            "realistic": fallback_agent_output(
                "realistic", {"context": {"decision": payload.decision}}
            ),
            "pessimistic": fallback_agent_output(
                "pessimistic", {"context": {"decision": payload.decision}}
            ),
        }
        result = _shape_result(
            payload,
            safe_outputs,
            score_outcome_probability(
                safe_outputs["optimistic"],
                safe_outputs["realistic"],
                safe_outputs["pessimistic"],
            ),
            execution_time_ms,
        )
        validated = SimulationResult.model_validate(result).model_dump(mode="json")
    if contradictions:
        validated["meta"]["contradictions"] = contradictions

    await emit_text("synthesizer", "Final futures reconciled into one simulation.", emit)
    await emit({"event": "agent_status", "agent": "synthesizer", "status": "done"})
    return validated
