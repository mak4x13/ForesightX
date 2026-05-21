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
                    "tone": {"type": "string", "enum": ["realistic"]},
                },
                "required": ["scenario", "tone"],
            },
        },
    }
]


async def run_realist(briefing: dict, emit: Emit) -> dict:
    await emit(
        {
            "event": "agent_status",
            "agent": "realist",
            "status": "thinking",
            "message": "Estimating the most likely trajectory...",
        }
    )
    decision = briefing.get("context", {}).get("decision", "the decision")
    system_prompt = """
You are AGENT 3 - REALIST AGENT for ForesightX.
Use tool calling to obtain milestone steps.
Return JSON with keys: probability_score, friction_points, milestones, trade_offs, final_state.
Model the statistically likely path with concrete friction and practical trade-offs.
"""
    try:
        output = await call_groq_tool_json(
            system_prompt=system_prompt,
            user_payload={"briefing": briefing},
            tools=TOOLS,
            tool_handlers={"generate_milestone_steps": generate_milestone_steps},
            fallback_tool_args={"scenario": decision, "tone": "realistic"},
        )
    except Exception as exc:
        output = fallback_agent_output("realistic", briefing)
        await emit(
            {
                "event": "error",
                "agent": "realist",
                "message": str(exc),
                "fallback": True,
            }
        )

    await emit_text("realist", output.get("final_state", "Realistic path mapped."), emit)
    await emit({"event": "agent_status", "agent": "realist", "status": "done"})
    return output
