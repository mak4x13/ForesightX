import PropTypes from "prop-types";

import { AgentCard } from "./AgentCard.jsx";

const nodeConfig = [
  {
    id: "orchestrator",
    x: "50%",
    y: "12%",
    color: "bg-amber",
    glow: "0 0 34px rgba(245,166,35,0.7)",
    label: "O",
  },
  {
    id: "optimist",
    x: "18%",
    y: "48%",
    color: "bg-optimist",
    glow: "0 0 34px rgba(57,255,106,0.55)",
    label: "B",
  },
  {
    id: "realist",
    x: "50%",
    y: "48%",
    color: "bg-realist",
    glow: "0 0 34px rgba(200,214,229,0.45)",
    label: "R",
  },
  {
    id: "pessimist",
    x: "82%",
    y: "48%",
    color: "bg-pessimist",
    glow: "0 0 34px rgba(255,59,59,0.55)",
    label: "W",
  },
  {
    id: "synthesizer",
    x: "50%",
    y: "84%",
    color: "bg-agent",
    glow: "0 0 34px rgba(180,79,255,0.65)",
    label: "S",
  },
];

export function AgentVisualizer({ agents, progress, compact }) {
  return (
    <section className={`mx-auto w-full max-w-6xl transition duration-page ${compact ? "py-3" : "py-8"}`}>
      <div className="mb-5 h-2 overflow-hidden rounded-full border border-border bg-surface">
        <div
          className="h-full bg-amber transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={`relative rounded-lg border border-border bg-surface/50 p-5 backdrop-blur-xl ${compact ? "min-h-32" : "min-h-[520px]"}`}>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className="connection-line" d="M50 16 L18 48 M50 16 L50 48 M50 16 L82 48 M18 52 L50 84 M50 52 L50 84 M82 52 L50 84" />
        </svg>
        {nodeConfig.map((node) => {
          const agent = agents[node.id];
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: node.x, top: node.y }}
            >
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${node.color} font-display text-sm font-black text-void ${agent?.status === "thinking" ? "animate-agent-pulse" : ""}`}
                style={{ boxShadow: node.glow }}
              >
                {node.label}
              </div>
              {!compact && (
                <div className="mt-3 w-52">
                  <AgentCard
                    name={agent?.name || node.id}
                    status={agent?.status || "idle"}
                    text={agent?.text || agent?.message || ""}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

AgentVisualizer.propTypes = {
  agents: PropTypes.object.isRequired,
  compact: PropTypes.bool,
  progress: PropTypes.number.isRequired,
};

AgentVisualizer.defaultProps = {
  compact: false,
};
