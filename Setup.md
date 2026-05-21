# ForesightX Setup Guide

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop for backend image testing
- Groq and Google AI Studio API keys for full agent execution

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 7860
```

For local AI calls, `backend/.env` should include:

```env
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash,gemini-2.0-flash,gemini-flash-latest
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. If port `5173` is busy, stop the existing Vite process first; the frontend is intentionally strict about this port so the backend CORS allowlist stays predictable.

## Smoke Tests

```bash
curl http://localhost:7860/
curl -H "X-Admin-Key: replace-with-admin-key" http://localhost:7860/admin/health
```
