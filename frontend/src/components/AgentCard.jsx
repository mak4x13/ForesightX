import PropTypes from "prop-types";

export function AgentCard({ name, status, text }) {
  const tone =
    status === "done" ? "bg-optimist" : status === "error" ? "bg-pessimist" : "bg-amber";

  return (
    <article className="min-h-40 rounded-lg border border-border bg-surface/80 p-4 shadow-[0_0_30px_rgba(180,79,255,0.1)] transition duration-page">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold text-textPrimary">{name}</h3>
        <span className={`h-2.5 w-2.5 rounded-full ${tone} ${status === "thinking" ? "animate-agent-pulse" : ""}`} />
      </div>
      <p className="mt-2 font-ui text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-textMuted">
        {status}
      </p>
      <p className="mt-3 max-h-28 overflow-hidden whitespace-pre-line font-mono text-xs leading-5 text-textPrimary">
        {text || "Awaiting signal..."}
      </p>
    </article>
  );
}

AgentCard.propTypes = {
  name: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  text: PropTypes.string,
};

AgentCard.defaultProps = {
  text: "",
};
