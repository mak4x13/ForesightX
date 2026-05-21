import asyncio
import copy
import json
from time import perf_counter

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.agents.optimist import run_optimist
from app.agents.pessimist import run_pessimist
from app.agents.realist import run_realist
from app.agents.synthesizer import run_synthesizer
from app.core.limiter import limiter
from app.core.metrics import mark_error
from app.models.schemas import SimulationRequest, WhatIfRequest
from app.tools.decision_tools import fallback_agent_output


router = APIRouter(prefix="/simulate", tags=["simulation"])


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _payload_from_briefing(briefing: dict, modification: str) -> SimulationRequest:
    context = briefing.get("context", {})
    situation = context.get("situation") or "Existing ForesightX simulation context."
    decision = context.get("decision") or "Re-evaluate the decision."
    domain = context.get("domain") or "General"
    return SimulationRequest(
        situation=situation,
        decision=f"{decision}\nWhat-if variable: {modification}",
        domain=domain,
    )


def _modified_briefing(original: dict, modification: str) -> dict:
    briefing = copy.deepcopy(original)
    context = briefing.setdefault("context", {})
    original_decision = context.get("decision") or "the original decision"
    context["decision"] = f"{original_decision}\nWhat-if variable: {modification}"
    context["what_if_modification"] = modification
    constraints = briefing.setdefault("constraints", [])
    if isinstance(constraints, list):
        constraints.append(f"What-if variable introduced by user: {modification}")
    return briefing


@router.post("/whatif")
@limiter.limit("6/minute")
async def whatif(request: Request, payload: WhatIfRequest):
    """Stream a partial rerun using the existing briefing and a changed variable."""

    async def event_stream():
        started = perf_counter()
        queue: asyncio.Queue[dict] = asyncio.Queue()

        async def emit(event: dict) -> None:
            await queue.put(event)

        try:
            briefing = _modified_briefing(
                payload.original_briefing,
                payload.modification,
            )
            simulation_payload = _payload_from_briefing(briefing, payload.modification)
            await emit(
                {
                    "event": "pipeline_stage",
                    "stage": "what_if_agents",
                    "progress": 35,
                }
            )

            tasks = {
                "optimistic": asyncio.create_task(run_optimist(briefing, emit)),
                "realistic": asyncio.create_task(run_realist(briefing, emit)),
                "pessimistic": asyncio.create_task(run_pessimist(briefing, emit)),
            }
            pending = set(tasks.values())
            while pending:
                try:
                    yield _sse(await asyncio.wait_for(queue.get(), timeout=0.1))
                except asyncio.TimeoutError:
                    pass
                pending = {task for task in pending if not task.done()}

            while not queue.empty():
                yield _sse(await queue.get())

            outputs = {}
            for name, task in tasks.items():
                try:
                    output = task.result()
                    if not isinstance(output, dict):
                        raise TypeError(f"{name} returned a non-object output.")
                    outputs[name] = output
                except Exception as exc:
                    tone = {
                        "optimistic": "optimistic",
                        "realistic": "realistic",
                        "pessimistic": "pessimistic",
                    }[name]
                    await emit(
                        {
                            "event": "error",
                            "agent": name,
                            "message": f"Recovered from what-if agent failure: {exc}",
                            "fallback": True,
                        }
                    )
                    outputs[name] = fallback_agent_output(tone, briefing)

            await emit(
                {
                    "event": "pipeline_stage",
                    "stage": "what_if_synthesis",
                    "progress": 82,
                }
            )
            while not queue.empty():
                yield _sse(await queue.get())

            execution_time_ms = int((perf_counter() - started) * 1000)
            result = await run_synthesizer(
                simulation_payload,
                outputs,
                execution_time_ms,
                emit,
            )
            result["meta"]["briefing"] = briefing
            result["meta"]["what_if_modification"] = payload.modification

            while not queue.empty():
                yield _sse(await queue.get())
            yield _sse({"event": "pipeline_stage", "stage": "complete", "progress": 100})
            yield _sse({"event": "whatif_complete", "result": result})
        except Exception as exc:
            mark_error()
            yield _sse(
                {
                    "event": "error",
                    "message": f"What-if branch failed: {exc}",
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")
