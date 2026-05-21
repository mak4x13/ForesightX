# ForesightX Setup Guide

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop for backend image testing
- Groq and Google AI Studio API keys for full agent execution

## Clone The Repository

```bash
git clone https://github.com/mak4x13/ForesightX.git
cd ForesightX
```

Optional root environment reference:

```bash
copy .env.example .env
```

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
GROQ_API_KEY=your-shared-groq-key
GROQ_API_KEY_OPTIMIST=
GROQ_API_KEY_REALIST=
GROQ_API_KEY_PESSIMIST=
GROQ_API_KEY_SYNTHESIZER=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_FALLBACK_MODELS=llama-3.1-8b-instant
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

## Reupload Backend V2 To Hugging Face Space

Vercel will redeploy the frontend from GitHub automatically after the push. For the backend, update the existing Hugging Face Docker Space with the backend files:

```bash
git subtree push --prefix backend hf main
```

If the Space rejects the push because its history diverged, use the Hugging Face web UI upload instead:

1. Open `https://huggingface.co/spaces/mak4x13/ForesightX/tree/main`.
2. Upload the contents of the local `backend/` folder.
3. Keep the Space SDK set to Docker.
4. Confirm Space secrets include `GROQ_API_KEY`, `GEMINI_API_KEY`, `ADMIN_API_KEY`, `ALLOWED_ORIGINS`, and optional Sentry/Groq per-agent keys.
5. Wait for the Space build logs to show the container listening on port `7860`.

After the Space rebuilds, smoke test:

```bash
curl https://mak4x13-foresightx.hf.space/
curl -H "X-Admin-Key: your-admin-key" https://mak4x13-foresightx.hf.space/admin/health
```

Then run one full simulation from the Vercel frontend and test follow-up, milestone drill-down, what-if, and share export.
