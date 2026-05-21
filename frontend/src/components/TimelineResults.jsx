import PropTypes from "prop-types";

import { TimelineCard } from "./TimelineCard.jsx";

export function TimelineResults({ result, onAgain, onHistory }) {
  if (!result) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-10">
      <div className="grid gap-5 lg:grid-cols-3">
        <TimelineCard outcome={result.outcomes.optimistic} variant="optimistic" delay={0} />
        <TimelineCard outcome={result.outcomes.realistic} variant="realistic" delay={150} />
        <TimelineCard outcome={result.outcomes.pessimistic} variant="pessimistic" delay={300} />
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          className="rounded-md bg-amber px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-void transition duration-hover hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(245,166,35,0.4)]"
          type="button"
          onClick={onAgain}
        >
          Simulate Again
        </button>
        <button
          className="rounded-md border border-cyan px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.2em] text-cyan transition duration-hover hover:scale-[1.03] hover:bg-cyan hover:text-void"
          type="button"
          onClick={onHistory}
        >
          View History
        </button>
      </div>
    </section>
  );
}

TimelineResults.propTypes = {
  onAgain: PropTypes.func.isRequired,
  onHistory: PropTypes.func.isRequired,
  result: PropTypes.object,
};

TimelineResults.defaultProps = {
  result: null,
};
