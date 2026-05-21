import PropTypes from "prop-types";
import { useEffect, useState } from "react";

function useCountUp(target) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame;
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - started) / 800, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

const accents = {
  OPTIMISTIC: "border-l-optimist text-optimist",
  REALISTIC: "border-l-realist text-realist",
  PESSIMISTIC: "border-l-pessimist text-pessimist",
};

const sectionLabels = {
  optimistic: "Enablers",
  realistic: "Friction",
  pessimistic: "Risks",
};

export function TimelineCard({ outcome, variant, delay }) {
  const count = useCountUp(outcome.probability);
  const accent = accents[outcome.label];
  const details =
    variant === "optimistic"
      ? outcome.enabling_factors
      : variant === "pessimistic"
        ? outcome.risk_factors
        : outcome.friction_points;

  return (
    <article
      className={`animate-timeline-reveal rounded-lg border border-l-4 border-border ${accent} bg-surface/80 p-5 opacity-0`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-ui text-[0.65rem] font-bold uppercase tracking-[0.25em]">
            {outcome.label}
          </p>
          <h3 className="mt-3 font-display text-lg font-bold text-textPrimary">
            {outcome.final_state}
          </h3>
        </div>
        <div className="probability-ring" style={{ "--value": `${count}%` }}>
          <span>{count}%</span>
        </div>
      </div>
      <ol className="mt-6 space-y-4">
        {outcome.milestones.map((milestone) => (
          <li key={milestone.step} className="grid grid-cols-[1.5rem_1fr] gap-3">
            <span className="mt-1 h-3 w-3 rounded-full bg-current shadow-[0_0_14px_currentColor]" />
            <span>
              <span className="block font-ui text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
                {milestone.timeframe}
              </span>
              <span className="mt-1 block font-mono text-sm leading-6 text-textPrimary/90">
                {milestone.description}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 font-ui text-[0.65rem] font-bold uppercase tracking-[0.22em] text-textMuted">
        {sectionLabels[variant]}
      </p>
      <div className="mt-6 grid gap-2">
        {details?.slice(0, 3).map((item) => (
          <p key={item} className="rounded-md border border-border bg-void/50 px-3 py-2 font-mono text-xs text-textMuted">
            {item}
          </p>
        ))}
      </div>
      {outcome.mitigation && (
        <p className="mt-4 rounded-md border border-amber/50 bg-amber/10 px-3 py-2 font-mono text-xs text-textPrimary">
          Mitigation: {outcome.mitigation}
        </p>
      )}
    </article>
  );
}

TimelineCard.propTypes = {
  delay: PropTypes.number.isRequired,
  outcome: PropTypes.object.isRequired,
  variant: PropTypes.string.isRequired,
};
