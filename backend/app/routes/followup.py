import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.agents.analyst import stream_analyst_response
from app.core.config import settings
from app.core.limiter import limiter
from app.core.metrics import mark_error
from app.models.schemas import FollowupRequest


router = APIRouter(prefix="/simulate", tags=["simulation"])


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/followup")
@limiter.limit("8/minute")
async def followup(request: Request, payload: FollowupRequest):
    """Stream concise analyst follow-up insight for a completed simulation."""

    async def event_stream():
        try:
            async for chunk in stream_analyst_response(payload):
                yield _sse({"event": "analyst_chunk", "chunk": chunk})
            yield _sse({"event": "analyst_done"})
        except Exception as exc:
            mark_error()
            yield _sse(
                {
                    "event": "error",
                    "message": str(exc)
                    if settings.environment == "development"
                    else "Follow-up analysis failed.",
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
