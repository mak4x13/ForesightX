# ForesightX Backend

FastAPI backend for the ForesightX multi-agent future simulation pipeline.

## Local Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 7860
```

## API Reference

| Method | Path | Purpose | Rate Limit |
| --- | --- | --- | --- |
| `GET` | `/` | Service identity and status | none |
| `POST` | `/simulate` | SSE simulation stream | `10/minute` |
| `GET` | `/simulate/stream` | Native EventSource-compatible SSE stream | `10/minute` |
| `POST` | `/simulate/followup` | SSE follow-up analyst stream | `8/minute` |
| `POST` | `/simulate/expand-milestone` | SSE milestone explanation stream | `15/minute` |
| `POST` | `/simulate/whatif` | SSE partial rerun for modified variables | `6/minute` |
| `GET` | `/admin/health` | Admin health payload protected by `X-Admin-Key` | `5/minute` |

## Agent Pipeline

1. Orchestrator receives the user scenario and prepares a structured briefing with Gemini. The default model is `gemini-2.5-flash`, with fallback retry models configured by `GEMINI_FALLBACK_MODELS`.
2. Optimist, Realist, and Pessimist agents run in parallel with Groq using `llama-3.3-70b-versatile` by default.
3. Synthesizer normalizes probabilities and returns the final simulation JSON.

If API keys are missing, each agent emits a fallback error event and returns deterministic demo-safe output. With `GEMINI_API_KEY` and `GROQ_API_KEY` configured, the agents call Gemini and Groq over HTTPS.

## Follow-Up Analysis

`POST /simulate/followup` streams analyst commentary for a completed simulation.

Request body:

```json
{
  "question": "Which path should I act on first?",
  "simulation_context": { "simulation_id": "full SimulationResult JSON" },
  "session_id": "simulation uuid"
}
```

SSE events:

```text
data: {"event":"analyst_chunk","chunk":"partial text"}
data: {"event":"analyst_done"}
data: {"event":"error","message":"..."}
```

## Milestone Drill-Down

`POST /simulate/expand-milestone` streams a short explanation for one selected timeline step.

Request body:

```json
{
  "milestone": "0-30 days: Early signal appears and the decision gains momentum.",
  "context": "OPTIMISTIC outcome\nProbability: 35%\nFinal state: ...",
  "outcome_type": "optimistic"
}
```

SSE events:

```text
data: {"event":"milestone_chunk","chunk":"partial text"}
data: {"event":"milestone_done"}
data: {"event":"error","message":"..."}
```

## What-If Branch

`POST /simulate/whatif` reruns only the Optimist, Realist, Pessimist, and Synthesizer agents using the original briefing plus one changed variable.

Request body:

```json
{
  "modification": "I have two extra engineers available",
  "original_briefing": { "context": { "situation": "...", "decision": "...", "domain": "Startup" } },
  "session_id": "simulation uuid"
}
```

SSE events include normal agent status/output events plus:

```text
data: {"event":"pipeline_stage","stage":"what_if_agents","progress":35}
data: {"event":"whatif_complete","result":{ "...": "updated SimulationResult JSON" }}
data: {"event":"error","message":"..."}
```

## Docker

```bash
cd backend
docker build -t foresightx-backend .
docker run --env-file .env -p 7860:7860 foresightx-backend
```
