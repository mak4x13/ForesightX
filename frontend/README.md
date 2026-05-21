# ForesightX Frontend

React, Vite, and Tailwind CSS frontend for the cinematic ForesightX simulation experience.

## Local Development

```bash
cd frontend
npm install
npm run dev
```

The app reads `VITE_BACKEND_URL` from `.env`; default local backend URL is `http://localhost:7860`. The dev server is pinned to `http://127.0.0.1:5173` with `--strictPort` so backend CORS stays predictable.

Vite uses `@vitejs/plugin-react` through `vite.config.js`, so JSX runs with the automatic React transform.

## Component Tree

```text
App
+-- InputForm
+-- AgentVisualizer
|   +-- AgentCard
+-- TimelineResults
|   +-- TimelineCard
|   +-- FollowUpPanel
+-- HistoryPanel
+-- HealthBadge
```

## Design System

The design system is defined in `src/design/tokens.js` and consumed by `tailwind.config.js` from the first build:

- Void background, glass surface, cyan stream lines, amber decision accents.
- Orbitron for display headings, IBM Plex Mono for agent streams, DM Sans for UI labels.
- GPU-friendly transform and opacity animations for page transitions, agent pulse, connection flow, and timeline reveal.

## Streaming

`useSimulation` opens a native `EventSource` connection to `/simulate/stream`, parses every SSE message, and updates agent cards, pipeline progress, error states, and final timeline results.

`FollowUpPanel` posts completed simulation context to `/simulate/followup` and streams analyst chunks into a collapsible panel.
