from app.agents.common import Emit, call_groq_json, emit_text
from app.core.config import settings
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
                    "tone": {"type": "string", "enum": ["optimistic"]},
                },
                "required": ["scenario", "tone"],
            },
        },
    }
]


async def run_optimist(briefing: dict, emit: Emit) -> dict:
    await emit(
        {
            "event": "agent_status",
            "agent": "optimist",
            "status": "thinking",
            "message": "Searching for best-path enablers...",
        }
    )
    decision = briefing.get("context", {}).get("decision", "the decision")
    system_prompt = """
You are AGENT 2 - OPTIMIST AGENT for ForesightX.
Use tool calling to obtain milestone steps.
Return JSON with keys: probability_score, enabling_factors, milestones, final_state, emotional_tone.
The outcome must be plausible, specific, and not blindly positive.
"""
    try:
        tool_output = generate_milestone_steps(decision, "optimistic")
        output = await call_groq_json(
            system_prompt=system_prompt,
            user_payload={
                "briefing": briefing,
                "tool_call": {
                    "name": "generate_milestone_steps",
                    "arguments": {"scenario": decision, "tone": "optimistic"},
                    "result": tool_output,
                },
            },
            api_key=settings.groq_api_key_optimist,
        )
    except Exception as exc:
        output = fallback_agent_output("optimistic", briefing)
        await emit(
            {
                "event": "error",
                "agent": "optimist",
                "message": str(exc),
                "fallback": True,
            }
        )

    if not isinstance(output, dict):
        output = fallback_agent_output("optimistic", briefing)
    await emit_text("optimist", output.get("final_state", "Optimistic path mapped."), emit)
    await emit({"event": "agent_status", "agent": "optimist", "status": "done"})
    return output
