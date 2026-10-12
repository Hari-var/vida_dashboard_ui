const STORAGE_KEY = "vida.apiBaseUrl";
const THEME_KEY = "vida.theme";

export const normalizeBaseUrl = (url) => (url || "").trim().replace(/\/+$/, "");

export const DEFAULT_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/task-run-info"
);

export function getInitialBaseUrl() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeBaseUrl(saved);
  } catch { /* storage unavailable */ }
  return DEFAULT_BASE_URL;
}

export function persistBaseUrl(url) {
  try {
    if (!url || url === DEFAULT_BASE_URL) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, url);
  } catch { /* storage unavailable */ }
}

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function persistTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
}

export const AUTO_REFRESH_MS = 30000;
