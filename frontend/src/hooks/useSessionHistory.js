const STORAGE_KEY = "foresightx.history";
const MAX_HISTORY = 5;

export function readSessionHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const seen = new Set();
    const deduped = raw
      .filter((item) => item?.simulation_id && !seen.has(item.simulation_id))
      .map((item) => {
        seen.add(item.simulation_id);
        return {
          ...item,
          title: item.title || item.input?.decision?.slice(0, 72) || "Untitled simulation",
        };
      })
      .slice(0, MAX_HISTORY);
    if (deduped.length !== raw.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
    }
    return deduped;
  } catch {
    return [];
  }
}

export function writeSessionHistory(entry) {
  const title = entry.input.decision.slice(0, 72);
  const existing = readSessionHistory().filter(
    (item) => item.simulation_id !== entry.simulation_id
  );
  const next = [{ ...entry, title }, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSessionHistory() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
