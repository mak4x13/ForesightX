const STORAGE_KEY = "foresightx.history";
const MAX_HISTORY = 5;

export function readSessionHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeSessionHistory(entry) {
  const title = entry.input.decision.slice(0, 72);
  const next = [{ ...entry, title }, ...readSessionHistory()].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSessionHistory() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
