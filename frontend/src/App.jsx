import { InputForm } from "./components/InputForm.jsx";
import { AgentVisualizer } from "./components/AgentVisualizer.jsx";
import { HealthBadge } from "./components/HealthBadge.jsx";
import { HistoryPanel } from "./components/HistoryPanel.jsx";
import { TimelineResults } from "./components/TimelineResults.jsx";
import { useSimulation } from "./hooks/useSimulation.js";
import { readSessionHistory, writeSessionHistory } from "./hooks/useSessionHistory.js";
import { useEffect, useState } from "react";

function App() {
  const { agents, error, loadResult, progress, reset, result, startSimulation, status } = useSimulation();
  const [history, setHistory] = useState(() => readSessionHistory());
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (result) {
      setHistory(writeSessionHistory(result));
    }
  }, [result]);

  const loadHistory = (item) => {
    setHistoryOpen(false);
    loadResult(item);
  };

  const displayedResult = result;

  return (
    <main className="min-h-screen overflow-x-hidden bg-void text-textPrimary">
      <section
        className={`relative px-4 py-8 transition duration-page ${
          status === "idle" ? "flex min-h-screen items-center justify-center" : "min-h-screen"
        }`}
      >
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 w-full">
          <div className={`text-center transition duration-page ${status === "idle" ? "mb-8" : "mb-4"}`}>
            <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-cyan">
              ForesightX
            </p>
            <h1 className={`${status === "idle" ? "mt-4 text-3xl md:text-6xl" : "mt-2 text-xl md:text-3xl"} font-display font-black leading-tight text-textPrimary`}>
              Every decision rewrites the future.
            </h1>
            <p className="typewriter mx-auto mt-4 max-w-3xl font-mono text-sm text-textMuted md:text-base">
              See all versions of it.
            </p>
          </div>
          {status === "idle" && <InputForm onSubmit={startSimulation} />}
          {status === "running" && (
            <>
              <InputForm compact isLoading onSubmit={startSimulation} />
              <AgentVisualizer agents={agents} progress={progress} />
            </>
          )}
          {status === "complete" && (
            <>
              <AgentVisualizer compact agents={agents} progress={progress} />
              <TimelineResults
                result={displayedResult}
                onAgain={reset}
                onHistory={() => setHistoryOpen(true)}
              />
            </>
          )}
          {status === "error" && (
            <div className="mx-auto max-w-xl animate-shake rounded-lg border border-pessimist bg-surface/80 p-5">
              <h2 className="font-display text-lg font-bold text-pessimist">Stream Interrupted</h2>
              <p className="mt-3 font-mono text-sm text-textMuted">{error}</p>
              <button
                className="mt-5 rounded-md bg-amber px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-void"
                type="button"
                onClick={reset}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </section>
      <HistoryPanel
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={loadHistory}
      />
      <HealthBadge />
    </main>
  );
}

export default App;
