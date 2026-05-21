from app.agents.common import Emit, call_groq_tool_json, emit_text
from app.tools.decision_tools import fallback_agent_output, generate_milestone_steps


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_milestone_steps",
            "description": "Generate ordered scenario milestone steps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario": {"type": "string"},
                    "tone": {"type": "string", "enum": ["pessimistic"]},
                },
                "required": ["scenario", "tone"],
            },
        },
    }
]


async def run_pessimist(briefing: dict, emit: Emit) -> dict:
    await emit(
        {
            "event": "agent_status",
            "agent": "pessimist",
            "status": "thinking",
            "message": "Tracing failure cascades and mitigations...",
        }
    )
    decision = briefing.get("context", {}).get("decision", "the decision")
    system_prompt = """
You are AGENT 4 - PESSIMIST AGENT for ForesightX.
Use tool calling to obtain milestone steps.
Return JSON with keys: probability_score, risk_factors, milestones, failure_triggers, final_state, mitigation.
The mitigation must be one concrete action the user can take.
"""
    try:
        output = await call_groq_tool_json(
            system_prompt=system_prompt,
            user_payload={"briefing": briefing},
            tools=TOOLS,
            tool_handlers={"generate_milestone_steps": generate_milestone_steps},
            fallback_tool_args={"scenario": decision, "tone": "pessimistic"},
        )
    except Exception as exc:
        output = fallback_agent_output("pessimistic", briefing)
        await emit(
            {
                "event": "error",
                "agent": "pessimist",
                "message": str(exc),
                "fallback": True,
            }
        )

    await emit_text("pessimist", output.get("final_state", "Pessimistic path mapped."), emit)
    await emit({"event": "agent_status", "agent": "pessimist", "status": "done"})
    return output
