import asyncio
from time import perf_counter

from app.agents.optimist import run_optimist
from app.agents.orchestrator import run_orchestrator
from app.agents.pessimist import run_pessimist
from app.agents.realist import run_realist
from app.agents.synthesizer import run_synthesizer
from app.models.schemas import SimulationRequest
from app.tools.decision_tools import fallback_agent_output


async def run_pipeline(payload: SimulationRequest):
    started = perf_counter()
    queue: asyncio.Queue[dict] = asyncio.Queue()

    async def emit(event: dict) -> None:
        await queue.put(event)

    await emit({"event": "pipeline_stage", "stage": "orchestration", "progress": 8})
    briefing = await run_orchestrator(payload, emit)
    while not queue.empty():
        yield await queue.get()

    await emit({"event": "pipeline_stage", "stage": "parallel_agents", "progress": 35})
    tasks = {
        "optimistic": asyncio.create_task(run_optimist(briefing, emit)),
        "realistic": asyncio.create_task(run_realist(briefing, emit)),
        "pessimistic": asyncio.create_task(run_pessimist(briefing, emit)),
    }
    pending = set(tasks.values())
    while pending:
        try:
            yield await asyncio.wait_for(queue.get(), timeout=0.1)
        except asyncio.TimeoutError:
            pass
        pending = {task for task in pending if not task.done()}

    while not queue.empty():
        yield await queue.get()

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
                    "agent": name.replace("istic", "ist")
                    if name == "optimistic"
                    else name,
                    "message": f"Recovered from agent failure: {exc}",
                    "fallback": True,
                }
            )
            outputs[name] = fallback_agent_output(tone, briefing)
    await emit({"event": "pipeline_stage", "stage": "synthesis", "progress": 80})
    while not queue.empty():
        yield await queue.get()

    execution_time_ms = int((perf_counter() - started) * 1000)
    try:
        result = await run_synthesizer(payload, outputs, execution_time_ms, emit)
        result["meta"]["briefing"] = briefing
    except Exception as exc:
        await emit(
            {
                "event": "error",
                "agent": "synthesizer",
                "message": f"Recovered from synthesis failure: {exc}",
                "fallback": True,
            }
        )
        safe_outputs = {
            "optimistic": fallback_agent_output("optimistic", briefing),
            "realistic": fallback_agent_output("realistic", briefing),
            "pessimistic": fallback_agent_output("pessimistic", briefing),
        }
        result = await run_synthesizer(payload, safe_outputs, execution_time_ms, emit)
        result["meta"]["briefing"] = briefing
    while not queue.empty():
        yield await queue.get()

    yield {"event": "pipeline_stage", "stage": "complete", "progress": 100}
    yield {"event": "simulation_complete", "result": result}
