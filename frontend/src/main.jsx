import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";

import App from "./App.jsx";
import "./index.css";
import { initSentry } from "./lib/sentry.js";

initSentry();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-void px-6 text-textPrimary">
          <section className="max-w-lg rounded-lg border border-pessimist bg-surface/80 p-6">
            <h1 className="font-display text-xl font-bold">Simulation Console Interrupted</h1>
            <p className="mt-3 font-mono text-sm text-textMuted">
              The interface hit an unexpected error. Refresh and rerun the scenario.
            </p>
          </section>
        </main>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
