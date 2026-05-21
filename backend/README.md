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
| `GET` | `/admin/health` | Admin health payload protected by `X-Admin-Key` | `5/minute` |

## Agent Pipeline

1. Orchestrator receives the user scenario and prepares a structured briefing with Gemini.
2. Optimist, Realist, and Pessimist agents run in parallel with Groq.
3. Synthesizer normalizes probabilities and returns the final simulation JSON.

If API keys are missing, each agent emits a fallback error event and returns deterministic demo-safe output. With `GEMINI_API_KEY` and `GROQ_API_KEY` configured, the agents call Gemini and Groq over HTTPS.

## Docker

```bash
cd backend
docker build -t foresightx-backend .
docker run --env-file .env -p 7860:7860 foresightx-backend
```
