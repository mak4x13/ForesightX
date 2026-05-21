export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:7860";

export function simulateUrl() {
  return `${API_BASE_URL}/simulate`;
}

export function simulateStreamUrl(input) {
  const params = new URLSearchParams(input);
  return `${API_BASE_URL}/simulate/stream?${params.toString()}`;
}

export function followupUrl() {
  return `${API_BASE_URL}/simulate/followup`;
}
