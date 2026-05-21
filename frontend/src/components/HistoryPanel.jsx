import { X } from "lucide-react";
import PropTypes from "prop-types";

export function HistoryPanel({ history, isOpen, onClose, onLoad }) {
  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-full w-80 border-r border-border bg-surface p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)] transition duration-page ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-textPrimary">Past Futures</h2>
        <button
          className="rounded-full border border-border p-2 text-textMuted transition hover:border-cyan hover:text-cyan"
          type="button"
          onClick={onClose}
          aria-label="Close history"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {history.length === 0 && (
          <div className="rounded-lg border border-border bg-void/60 p-4">
            <p className="font-mono text-sm text-textMuted">
              No saved simulations yet. Completed runs will appear here.
            </p>
          </div>
        )}
        {history.map((item) => (
          <button
            key={item.simulation_id}
            className="w-full rounded-lg border border-border bg-void/60 p-4 text-left transition duration-hover hover:scale-[1.02] hover:border-cyan"
            type="button"
            onClick={() => onLoad(item)}
          >
            <span className="font-ui text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber">
              {item.input.domain}
            </span>
            <span className="mt-2 block font-mono text-sm leading-5 text-textPrimary">
              {item.title}
            </span>
            <span className="mt-3 block font-mono text-xs text-textMuted">
              {new Date(item.timestamp).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

HistoryPanel.propTypes = {
  history: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLoad: PropTypes.func.isRequired,
};
