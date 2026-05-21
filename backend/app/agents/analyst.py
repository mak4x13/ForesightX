from app.agents.common import stream_groq_text
from app.core.config import settings
from app.models.schemas import FollowupRequest


SYSTEM_PROMPT = """
You are ForesightX Analyst. Given the simulation results above,
answer the user's follow-up question with specific, grounded insight. Reference
the three outcomes directly. Be concise and decisive. Format your response with
clear sections if needed. Max 400 words.
"""


async def stream_analyst_response(payload: FollowupRequest):
    async for chunk in stream_groq_text(
        system_prompt=SYSTEM_PROMPT,
        user_payload={
            "question": payload.question,
            "simulation_context": payload.simulation_context.model_dump(mode="json"),
            "session_id": payload.session_id,
        },
        api_key=settings.groq_api_key_synthesizer,
    ):
        yield chunk
