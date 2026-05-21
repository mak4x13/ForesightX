export function HealthBadge() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 rounded-full border border-border bg-surface/80 px-3 py-2 font-mono text-xs text-textMuted backdrop-blur">
      API: <span className="text-cyan">configured</span>
    </div>
  );
}
