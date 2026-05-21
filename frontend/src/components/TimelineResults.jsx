import PropTypes from "prop-types";

import { FollowUpPanel } from "./FollowUpPanel.jsx";
import { TimelineCard } from "./TimelineCard.jsx";

export function TimelineResults({ result = null, onAgain }) {
  if (!result) {
    return null;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-3">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-3">
        <TimelineCard outcome={result.outcomes.optimistic} variant="optimistic" delay={0} />
        <TimelineCard outcome={result.outcomes.realistic} variant="realistic" delay={150} />
        <TimelineCard outcome={result.outcomes.pessimistic} variant="pessimistic" delay={300} />
      </div>
      <div className="pt-3">
        <FollowUpPanel result={result} />
      </div>
      <div className="flex shrink-0 flex-wrap justify-center gap-3 py-3">
        <button
          className="rounded-md bg-amber px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-void transition duration-hover hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(245,166,35,0.4)]"
          type="button"
          onClick={onAgain}
        >
          Simulate Again
        </button>
      </div>
    </section>
  );
}

TimelineResults.propTypes = {
  onAgain: PropTypes.func.isRequired,
  result: PropTypes.object,
};
