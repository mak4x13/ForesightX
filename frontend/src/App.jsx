import { History } from "lucide-react";
import { useEffect, useState } from "react";

import { InputForm } from "./components/InputForm.jsx";
import { AgentVisualizer } from "./components/AgentVisualizer.jsx";
import { HealthBadge } from "./components/HealthBadge.jsx";
import { HistoryPanel } from "./components/HistoryPanel.jsx";
import { TimelineResults } from "./components/TimelineResults.jsx";
import { useSimulation } from "./hooks/useSimulation.js";
import { readSessionHistory, writeSessionHistory } from "./hooks/useSessionHistory.js";

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
        className={`relative px-4 transition duration-page ${
          status === "idle"
            ? "flex min-h-screen items-center justify-center py-8"
            : status === "complete"
              ? "min-h-screen overflow-y-auto py-3 lg:h-screen lg:overflow-hidden"
              : "min-h-screen py-8"
        }`}
      >
        <div className="starfield" aria-hidden="true" />
        {status !== "complete" && (
          <button
            className="absolute right-4 top-4 z-30 inline-flex items-center gap-2 rounded-md border border-cyan bg-void/50 px-3 py-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyan backdrop-blur transition duration-hover hover:scale-[1.03] hover:bg-cyan hover:text-void md:right-6 md:top-6"
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open history"
          >
            <History size={16} />
            <span className="hidden sm:inline">History</span>
          </button>
        )}
        <div className={`relative z-10 w-full ${status === "complete" ? "mx-auto flex min-h-screen max-w-7xl flex-col lg:h-full lg:min-h-0" : ""}`}>
          {status !== "complete" && (
          <div className={`text-center transition duration-page ${status === "idle" ? "mb-8" : "mb-4"}`}>
            <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-cyan">
              ForesightX
            </p>
            <h1 className={`${status === "idle" ? "mt-4 text-3xl md:text-6xl" : "mt-2 text-xl md:text-3xl"} font-display font-black leading-tight text-textPrimary`}>
              Every decision rewrites the future.
            </h1>
            <p className="typewriter mx-auto mt-4 max-w-[20rem] font-mono text-sm text-textMuted sm:max-w-3xl md:text-base">
              See all versions of it.
            </p>
          </div>
          )}
          {status === "idle" && <InputForm onSubmit={startSimulation} />}
          {status === "running" && (
            <>
              <InputForm compact isLoading onSubmit={startSimulation} />
              <AgentVisualizer agents={agents} progress={progress} />
            </>
          )}
          {status === "complete" && (
            <>
              <div className="flex shrink-0 flex-col justify-between gap-3 overflow-hidden rounded-lg border border-border bg-surface/45 p-3 backdrop-blur-xl lg:h-[180px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-cyan">
                      ForesightX
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h1 className="font-display text-lg font-black uppercase text-textPrimary md:text-2xl">
                        Simulation Complete
                      </h1>
                      <span className="rounded-full border border-amber/50 bg-amber/10 px-3 py-1 font-ui text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber">
                        {displayedResult.input.domain}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <p className="text-left font-mono text-[0.65rem] leading-4 text-textMuted sm:text-right sm:text-xs">
                      {new Date(displayedResult.timestamp).toLocaleString()}
                    </p>
                    <button
                      className="inline-flex items-center gap-2 rounded-md border border-cyan bg-void/50 px-3 py-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-cyan backdrop-blur transition duration-hover hover:scale-[1.03] hover:bg-cyan hover:text-void"
                      type="button"
                      onClick={() => setHistoryOpen(true)}
                      aria-label="Open history"
                    >
                      <History size={16} />
                      <span className="hidden sm:inline">History</span>
                    </button>
                  </div>
                </div>
                <AgentVisualizer compact agents={agents} progress={progress} />
              </div>
              <TimelineResults
                result={displayedResult}
                onAgain={reset}
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
