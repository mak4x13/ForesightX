import { ChevronDown, GitBranch, LoaderCircle } from "lucide-react";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import { expandMilestoneUrl } from "../lib/api.js";

async function streamMilestoneExpansion({ milestone, context, outcomeType, onChunk }) {
  const response = await fetch(expandMilestoneUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      milestone,
      context,
      outcome_type: outcomeType,
    }),
  });

  if (!response.ok) {
    throw new Error(`/simulate/expand-milestone returned ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Milestone stream did not open.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) {
        continue;
      }
      const payload = JSON.parse(dataLine.replace(/^data:\s?/, ""));
      if (payload.event === "milestone_chunk") {
        onChunk(payload.chunk);
      }
      if (payload.event === "error") {
        throw new Error(payload.message);
      }
    }
  }
}

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

export function TimelineCard({
  delay,
  isUpdating,
  isWhatIfOpen,
  modifiedLabel,
  onOpenWhatIf,
  onSubmitWhatIf,
  outcome,
  variant,
}) {
  const count = useCountUp(outcome.probability);
  const [whatIfDraft, setWhatIfDraft] = useState("");
  const [expandedStep, setExpandedStep] = useState(null);
  const [expandedContent, setExpandedContent] = useState({});
  const [loadingStep, setLoadingStep] = useState(null);
  const [expansionErrors, setExpansionErrors] = useState({});
  const accent = accents[outcome.label];
  const details =
    variant === "optimistic"
      ? outcome.enabling_factors
      : variant === "pessimistic"
        ? outcome.risk_factors
        : outcome.friction_points;
  const context = [
    `${outcome.label} outcome`,
    `Probability: ${outcome.probability}%`,
    `Final state: ${outcome.final_state}`,
    details?.length ? `${sectionLabels[variant]}: ${details.join("; ")}` : "",
    outcome.mitigation ? `Mitigation: ${outcome.mitigation}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    setExpandedStep(null);
    setExpandedContent({});
    setLoadingStep(null);
    setExpansionErrors({});
  }, [outcome]);

  const toggleMilestone = async (milestone) => {
    const key = String(milestone.step);
    if (expandedStep === key) {
      setExpandedStep(null);
      return;
    }

    setExpandedStep(key);
    if (expandedContent[key] || loadingStep === key) {
      return;
    }

    setLoadingStep(key);
    setExpansionErrors((current) => ({ ...current, [key]: "" }));

    try {
      await streamMilestoneExpansion({
        milestone: `${milestone.timeframe}: ${milestone.description}`,
        context,
        outcomeType: variant,
        onChunk: (chunk) => {
          setExpandedContent((current) => ({
            ...current,
            [key]: `${current[key] || ""}${chunk}`,
          }));
        },
      });
    } catch (error) {
      setExpansionErrors((current) => ({
        ...current,
        [key]: error.message || "Milestone expansion failed.",
      }));
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <article
      className={`timeline-scroll-card relative max-h-[60vh] min-h-[24rem] overflow-y-auto rounded-lg border border-l-4 border-border ${accent} bg-surface/80 p-5 opacity-0 animate-timeline-reveal transition duration-300 lg:h-full lg:max-h-none lg:min-h-0 ${
        isUpdating ? "scale-[0.99] border-amber/80 shadow-[0_0_28px_rgba(245,166,35,0.2)]" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-ui text-[0.65rem] font-bold uppercase tracking-[0.25em]">
              {outcome.label}
            </p>
            {modifiedLabel && (
              <span className="max-w-full truncate rounded-full border border-amber/50 bg-amber/10 px-2 py-1 font-ui text-[0.55rem] font-bold uppercase tracking-[0.12em] text-amber">
                Modified: {modifiedLabel}
              </span>
            )}
          </div>
          <h3 className="mt-3 font-display text-lg font-bold text-textPrimary">
            {outcome.final_state}
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-cyan/60 bg-void/30 px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan transition duration-hover hover:scale-[1.03] hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdating}
            type="button"
            onClick={() => onOpenWhatIf(variant)}
          >
            <GitBranch size={13} />
            What If...
          </button>
          <div className="probability-ring" style={{ "--value": `${count}%` }}>
            <span>{count}%</span>
          </div>
        </div>
      </div>
      {isWhatIfOpen && (
        <form
          className="mt-4 rounded-md border border-amber/40 bg-void/55 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = whatIfDraft.trim();
            if (!trimmed || isUpdating) {
              return;
            }
            onSubmitWhatIf(variant, trimmed);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label>
              <input
                className="w-full rounded-md border border-border bg-surface/70 px-3 py-2 font-mono text-xs text-textPrimary outline-none transition focus:border-amber focus:shadow-[0_0_0_3px_rgba(245,166,35,0.12)]"
                maxLength={200}
                placeholder='Change one variable, e.g. "I have more funding"...'
                value={whatIfDraft}
                onChange={(event) => setWhatIfDraft(event.target.value)}
              />
              <span className="mt-1 block text-right font-mono text-[0.6rem] text-textMuted">
                {whatIfDraft.length}/200
              </span>
            </label>
            <button
              className="h-10 rounded-md bg-amber px-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.16em] text-void transition duration-hover hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating || whatIfDraft.trim().length === 0}
              type="submit"
            >
              {isUpdating ? "Running" : "Re-Simulate"}
            </button>
          </div>
        </form>
      )}
      <ol className="mt-6 space-y-3">
        {outcome.milestones.map((milestone) => {
          const key = String(milestone.step);
          const isExpanded = expandedStep === key;
          const isLoading = loadingStep === key;
          const error = expansionErrors[key];
          const expansion = expandedContent[key];

          return (
            <li key={milestone.step} className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="mt-3 h-3 w-3 rounded-full bg-current shadow-[0_0_14px_currentColor]" />
              <div>
                <button
                  className={`group w-full rounded-md px-2 py-2 text-left transition duration-hover hover:bg-void/45 ${
                    isExpanded ? "bg-void/55" : ""
                  }`}
                  type="button"
                  onClick={() => toggleMilestone(milestone)}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-ui text-xs font-semibold uppercase tracking-[0.18em] text-textMuted">
                        {milestone.timeframe}
                      </span>
                      <span className="mt-1 block font-mono text-sm leading-6 text-textPrimary/90">
                        {milestone.description}
                      </span>
                    </span>
                    {isLoading ? (
                      <LoaderCircle className="mt-1 shrink-0 animate-spin text-cyan" size={15} />
                    ) : (
                      <ChevronDown
                        className={`mt-1 shrink-0 text-cyan opacity-0 transition duration-hover group-hover:opacity-100 ${
                          isExpanded ? "rotate-180 opacity-100" : ""
                        }`}
                        size={16}
                      />
                    )}
                  </span>
                </button>
                {isExpanded && (
                  <div className="mt-2 rounded-md border-l-2 border-cyan bg-border/25 px-3 py-2">
                    <p className="whitespace-pre-wrap font-mono text-xs leading-5 text-textPrimary/85">
                      {expansion ||
                        (isLoading
                          ? "Expanding this future branch..."
                          : error || "No expansion returned.")}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
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
  isUpdating: PropTypes.bool.isRequired,
  isWhatIfOpen: PropTypes.bool.isRequired,
  modifiedLabel: PropTypes.string,
  onOpenWhatIf: PropTypes.func.isRequired,
  onSubmitWhatIf: PropTypes.func.isRequired,
  outcome: PropTypes.object.isRequired,
  variant: PropTypes.string.isRequired,
};
