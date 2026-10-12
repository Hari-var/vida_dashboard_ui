export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const toTime = (value) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};

export function durationMs(start, end) {
  const s = toTime(start);
  if (s == null) return null;
  const e = toTime(end) ?? Date.now();
  return Math.max(0, e - s);
}

export function formatDuration(start, end) {
  const ms = durationMs(start, end);
  if (ms == null) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 1) return `${ms} ms`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] ?? "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export const byNewest = (field) => (a, b) => (toTime(b[field]) ?? 0) - (toTime(a[field]) ?? 0);

export function percent(part, total) {
  if (!total) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

export function relativeTime(value) {
  const t = toTime(value);
  if (t == null) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
