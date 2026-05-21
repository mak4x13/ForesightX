import PropTypes from "prop-types";

import { AgentCard } from "./AgentCard.jsx";

const nodeConfig = [
  {
    id: "orchestrator",
    x: "50%",
    y: "12%",
    color: "bg-amber",
    glow: "0 0 34px rgba(245,166,35,0.7)",
    label: "OR",
    shortName: "Orchestrator",
  },
  {
    id: "optimist",
    x: "18%",
    y: "48%",
    color: "bg-optimist",
    glow: "0 0 34px rgba(57,255,106,0.55)",
    label: "OP",
    shortName: "Optimist",
  },
  {
    id: "realist",
    x: "50%",
    y: "48%",
    color: "bg-realist",
    glow: "0 0 34px rgba(200,214,229,0.45)",
    label: "RE",
    shortName: "Realist",
  },
  {
    id: "pessimist",
    x: "82%",
    y: "48%",
    color: "bg-pessimist",
    glow: "0 0 34px rgba(255,59,59,0.55)",
    label: "PE",
    shortName: "Pessimist",
  },
  {
    id: "synthesizer",
    x: "50%",
    y: "84%",
    color: "bg-agent",
    glow: "0 0 34px rgba(180,79,255,0.65)",
    label: "SY",
    shortName: "Synthesizer",
  },
];

export function AgentVisualizer({ agents, progress, compact = false }) {
  const agentList = nodeConfig.map((node) => ({
    ...node,
    agent: agents[node.id],
  }));

  if (compact) {
    return (
      <section className="w-full">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.24em] text-textMuted">
            Agent Pipeline
          </p>
          <p className="font-mono text-xs text-amber">{progress}%</p>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full border border-border bg-void/70">
          <div
            className="h-full bg-amber shadow-[0_0_18px_rgba(245,166,35,0.65)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-md border border-border bg-void/35 px-3 py-2 scrollbar-hidden sm:grid sm:grid-cols-5 sm:overflow-visible">
          {agentList.map((node) => (
            <div key={node.id} className="flex min-w-[8.5rem] items-center justify-start gap-2 sm:min-w-0 sm:justify-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${node.color} font-display text-[0.58rem] font-black text-void`}
                style={{ boxShadow: node.glow }}
              >
                {node.label}
              </div>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate font-ui text-[0.62rem] font-bold text-textPrimary">
                  {node.shortName}
                </span>
                <span className="mt-1 truncate font-ui text-[0.52rem] font-semibold uppercase tracking-[0.15em] text-textMuted">
                  {node.agent?.status || "idle"}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={`mx-auto w-full max-w-6xl px-1 transition duration-page ${compact ? "py-3" : "py-8"}`}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-ui text-[0.65rem] font-bold uppercase tracking-[0.25em] text-textMuted">
          Agent Pipeline
        </p>
        <p className="font-mono text-xs text-amber">{progress}%</p>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full border border-border bg-surface">
        <div
          className="h-full bg-amber shadow-[0_0_18px_rgba(245,166,35,0.65)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="relative hidden min-h-[560px] rounded-lg border border-border bg-surface/50 p-5 backdrop-blur-xl md:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className="connection-line" d="M50 16 L18 48 M50 16 L50 48 M50 16 L82 48 M18 52 L50 84 M50 52 L50 84 M82 52 L50 84" />
        </svg>
        {agentList.map((node) => {
          const agent = node.agent;
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: node.x, top: node.y }}
            >
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${node.color} font-display text-xs font-black text-void ${agent?.status === "thinking" ? "animate-agent-pulse" : ""}`}
                style={{ boxShadow: node.glow }}
              >
                {node.label}
              </div>
              <div className="mt-3 w-52">
                <AgentCard
                  name={agent?.name || node.id}
                  status={agent?.status || "idle"}
                  text={agent?.text || agent?.message || ""}
                />
              </div>
            </div>
          );
        })}
      </div>
        <div className="grid gap-3 md:hidden">
          {agentList.map((node) => (
            <div key={node.id} className="grid grid-cols-[3.5rem_1fr] items-start gap-3 rounded-lg border border-border bg-surface/65 p-3 backdrop-blur-xl">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${node.color} font-display text-[0.65rem] font-black text-void ${node.agent?.status === "thinking" ? "animate-agent-pulse" : ""}`}
                style={{ boxShadow: node.glow }}
              >
                {node.label}
              </div>
              <AgentCard
                name={node.agent?.name || node.id}
                status={node.agent?.status || "idle"}
                text={node.agent?.text || node.agent?.message || ""}
              />
            </div>
          ))}
        </div>
    </section>
  );
}

AgentVisualizer.propTypes = {
  agents: PropTypes.object.isRequired,
  compact: PropTypes.bool,
  progress: PropTypes.number.isRequired,
};
