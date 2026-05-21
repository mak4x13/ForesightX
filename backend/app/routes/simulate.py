import json

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.agents.pipeline import run_pipeline
from app.core.limiter import limiter
from app.models.schemas import SimulationRequest


router = APIRouter(tags=["simulation"])


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.post("/simulate")
@limiter.limit("10/minute")
async def simulate(request: Request, payload: SimulationRequest):
    """Stream the ForesightX simulation pipeline with SSE events."""

    async def event_stream():
        try:
            async for event in run_pipeline(payload):
                yield _sse(event)
        except Exception:
            yield _sse(
                {
                    "event": "error",
                    "agent": "pipeline",
                    "message": "Simulation failed before completion.",
                    "fallback": False,
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/simulate/stream")
@limiter.limit("10/minute")
async def simulate_stream(
    request: Request,
    situation: str = Query(..., min_length=10, max_length=2400),
    decision: str = Query(..., min_length=4, max_length=1200),
    domain: str = Query(..., min_length=2, max_length=64),
):
    """EventSource-compatible SSE route; native EventSource only supports GET."""
    payload = SimulationRequest(situation=situation, decision=decision, domain=domain)

    async def event_stream():
        try:
            async for event in run_pipeline(payload):
                yield _sse(event)
        except Exception:
            yield _sse(
                {
                    "event": "error",
                    "agent": "pipeline",
                    "message": "Simulation failed before completion.",
                    "fallback": False,
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
