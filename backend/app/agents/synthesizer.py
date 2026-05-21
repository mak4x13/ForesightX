from datetime import datetime, timezone
from uuid import uuid4

from app.agents.common import Emit, call_groq_tool_json, emit_text
from app.models.schemas import SimulationRequest, SimulationResult
from app.tools.decision_tools import (
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
    optimistic = outputs["optimistic"]
    realistic = outputs["realistic"]
    pessimistic = outputs["pessimistic"]
    return {
        "simulation_id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc),
        "input": payload.model_dump(),
        "outcomes": {
            "optimistic": {
                "probability": probabilities["optimistic"],
                "label": "OPTIMISTIC",
                "enabling_factors": optimistic.get("enabling_factors", [])[:5],
                "milestones": normalize_milestones(optimistic.get("milestones", [])),
                "final_state": optimistic.get("final_state", ""),
                "emotional_tone": optimistic.get("emotional_tone", ""),
            },
            "realistic": {
                "probability": probabilities["realistic"],
                "label": "REALISTIC",
                "friction_points": realistic.get("friction_points", [])[:5],
                "milestones": normalize_milestones(realistic.get("milestones", [])),
                "trade_offs": realistic.get("trade_offs", [])[:5],
                "final_state": realistic.get("final_state", ""),
            },
            "pessimistic": {
                "probability": probabilities["pessimistic"],
                "label": "PESSIMISTIC",
                "risk_factors": pessimistic.get("risk_factors", [])[:5],
                "milestones": normalize_milestones(pessimistic.get("milestones", [])),
                "failure_triggers": pessimistic.get("failure_triggers", [])[:5],
                "final_state": pessimistic.get("final_state", ""),
                "mitigation": pessimistic.get("mitigation", ""),
            },
        },
        "meta": {
            "total_agents": 4,
            "execution_time_ms": execution_time_ms,
            "model_orchestrator": "gemini-1.5-flash",
            "model_agents": "llama-3.3-70b-versatile",
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
        synthesis = await call_groq_tool_json(
            system_prompt=system_prompt,
            user_payload={"outputs": outputs},
            tools=TOOLS,
            tool_handlers={
                "score_outcome_probability": score_outcome_probability,
                "flag_logical_inconsistency": flag_logical_inconsistency,
            },
            fallback_tool_args={
                "optimist_out": outputs["optimistic"],
                "realist_out": outputs["realistic"],
                "pessimist_out": outputs["pessimistic"],
            },
        )
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

    result = _shape_result(payload, outputs, probabilities, execution_time_ms)
    validated = SimulationResult.model_validate(result).model_dump(mode="json")
    if contradictions:
        validated["meta"]["contradictions"] = contradictions

    await emit_text("synthesizer", "Final futures reconciled into one simulation.", emit)
    await emit({"event": "agent_status", "agent": "synthesizer", "status": "done"})
    return validated
