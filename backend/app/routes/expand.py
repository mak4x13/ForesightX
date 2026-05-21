import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.agents.common import stream_groq_text
from app.core.config import settings
from app.core.limiter import limiter
from app.core.metrics import mark_error
from app.models.schemas import ExpandMilestoneRequest


router = APIRouter(prefix="/simulate", tags=["simulation"])


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/expand-milestone")
@limiter.limit("15/minute")
async def expand_milestone(request: Request, payload: ExpandMilestoneRequest):
    """Stream a short explanation for one milestone step."""

    async def event_stream():
        try:
            async for chunk in stream_groq_text(
                system_prompt=(
                    "You are a ForesightX milestone analyst. Explain this single "
                    "milestone in 2-3 concrete sentences. Ground the explanation in "
                    "the supplied outcome context. Do not repeat the full simulation."
                ),
                user_payload={
                    "milestone": payload.milestone,
                    "context": payload.context,
                    "outcome_type": payload.outcome_type,
                },
            ):
                yield _sse({"event": "milestone_chunk", "chunk": chunk})
            yield _sse({"event": "milestone_done"})
        except Exception as exc:
            mark_error()
            yield _sse(
                {
                    "event": "error",
                    "message": str(exc)
                    if settings.environment == "development"
                    else "Milestone expansion failed.",
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
