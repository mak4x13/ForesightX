import { Rocket, Scale, ShieldAlert, Sprout } from "lucide-react";
import PropTypes from "prop-types";
import { useState } from "react";

const domains = [
  { label: "Startup", icon: Rocket },
  { label: "Career", icon: Scale },
  { label: "Health", icon: ShieldAlert },
  { label: "Life", icon: Sprout },
];

export function InputForm({ onSubmit, isLoading, compact }) {
  const [form, setForm] = useState({
    situation: "",
    decision: "",
    domain: "Startup",
  });

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (form.situation.trim().length < 10 || form.decision.trim().length < 4) {
      return;
    }
    onSubmit({
      situation: form.situation.trim(),
      decision: form.decision.trim(),
      domain: form.domain,
    });
  };

  return (
    <form
      className={`rounded-lg border border-border bg-surface/70 p-5 shadow-[0_0_50px_rgba(0,212,255,0.12)] backdrop-blur-xl transition duration-page md:p-6 ${
        compact ? "mx-auto max-w-5xl" : ""
      }`}
      onSubmit={submit}
    >
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
        <label className="block">
          <span className="font-ui text-xs font-semibold uppercase tracking-[0.2em] text-textMuted">
            Situation
          </span>
          <textarea
            className="mt-2 min-h-36 w-full resize-none rounded-md border border-border bg-void/80 p-4 font-mono text-sm text-textPrimary outline-none transition focus:border-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.12)]"
            maxLength={2400}
            placeholder="Describe the current state, constraints, and what is at stake."
            value={form.situation}
            onChange={(event) => updateField("situation", event.target.value)}
          />
          <span className="mt-2 block text-right font-mono text-xs text-textMuted">
            {form.situation.length}/2400
          </span>
        </label>
        <label className="block">
          <span className="font-ui text-xs font-semibold uppercase tracking-[0.2em] text-textMuted">
            Decision
          </span>
          <textarea
            className="mt-2 min-h-36 w-full resize-none rounded-md border border-border bg-void/80 p-4 font-mono text-sm text-textPrimary outline-none transition focus:border-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.12)]"
            maxLength={1200}
            placeholder="What choice are you considering?"
            value={form.decision}
            onChange={(event) => updateField("decision", event.target.value)}
          />
          <span className="mt-2 block text-right font-mono text-xs text-textMuted">
            {form.decision.length}/1200
          </span>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {domains.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-ui text-sm font-semibold transition duration-hover hover:scale-[1.03] ${
              form.domain === label
                ? "border-amber bg-amber text-void shadow-[0_0_22px_rgba(245,166,35,0.25)]"
                : "border-border text-textMuted hover:border-cyan hover:text-cyan"
            }`}
            type="button"
            onClick={() => updateField("domain", label)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <button
        className="mt-6 flex w-full items-center justify-center rounded-md bg-amber px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-void transition duration-hover hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(245,166,35,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-void border-t-transparent" /> : "Begin Simulation"}
      </button>
    </form>
  );
}

InputForm.propTypes = {
  compact: PropTypes.bool,
  isLoading: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
};

InputForm.defaultProps = {
  compact: false,
  isLoading: false,
};
