import { forwardRef } from "react";
import PropTypes from "prop-types";

const variants = [
  ["optimistic", "OPTIMISTIC", "text-optimist border-optimist"],
  ["realistic", "REALISTIC", "text-realist border-realist"],
  ["pessimistic", "PESSIMISTIC", "text-pessimist border-pessimist"],
];

export const ShareSnapshot = forwardRef(function ShareSnapshot({ result }, ref) {
  if (!result) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed left-[-9999px] top-0 w-[1200px] bg-void p-10 text-textPrimary"
    >
      <div className="rounded-xl border border-border bg-surface/90 p-8">
        <header className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <p className="font-display text-lg font-bold uppercase tracking-[0.35em] text-cyan">
              ForesightX
            </p>
            <h1 className="mt-3 font-display text-3xl font-black uppercase">
              Future Simulation
            </h1>
            <p className="mt-2 max-w-3xl font-mono text-sm leading-6 text-textMuted">
              {result.input.situation}
            </p>
            <p className="mt-2 max-w-3xl font-mono text-sm leading-6 text-textPrimary">
              Decision: {result.input.decision}
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-amber/60 bg-amber/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.22em] text-amber">
              {result.input.domain}
            </span>
            <p className="mt-4 font-mono text-xs text-textMuted">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-5">
          {variants.map(([key, label, accent]) => {
            const outcome = result.outcomes[key];
            const detail =
              key === "optimistic"
                ? outcome.enabling_factors
                : key === "pessimistic"
                  ? outcome.risk_factors
                  : outcome.friction_points;

            return (
              <article
                key={key}
                className={`rounded-lg border border-l-4 ${accent} border-border bg-void/70 p-5`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.24em]">
                    {label}
                  </p>
                  <p className="font-display text-2xl font-black">{outcome.probability}%</p>
                </div>
                <h2 className="mt-5 font-display text-xl font-bold leading-8 text-textPrimary">
                  {outcome.final_state}
                </h2>
                <ol className="mt-5 space-y-3">
                  {outcome.milestones.slice(0, 3).map((milestone) => (
                    <li key={milestone.step} className="font-mono text-xs leading-5">
                      <span className="block font-ui text-[0.65rem] font-bold uppercase tracking-[0.18em] text-textMuted">
                        {milestone.timeframe}
                      </span>
                      {milestone.description}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 space-y-2">
                  {detail?.slice(0, 2).map((item) => (
                    <p
                      key={item}
                      className="rounded-md border border-border bg-surface/70 px-3 py-2 font-mono text-[0.7rem] leading-5 text-textMuted"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ShareSnapshot.propTypes = {
  result: PropTypes.object,
};
