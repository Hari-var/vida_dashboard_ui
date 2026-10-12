const ORDER = ["success", "completed", "failed", "error", "running", "pending", "cancelled", "canceled"];

export default function StatusBar({ counts }) {
  const extra = Object.keys(counts).filter((k) => !ORDER.includes(k));
  const keys = [...ORDER.filter((k) => counts[k] > 0), ...extra.filter((k) => counts[k] > 0)];
  const all = keys.reduce((sum, k) => sum + (counts[k] || 0), 0) || 1;

  if (!keys.length) return (
    <div>
      <div className="statusbar" role="img" aria-label="No data"><span style={{ flex: 1, background: "var(--bg3)" }} /></div>
      <ul className="legend"><li><span className="legend-dot" style={{ background: "var(--bg3)" }} />No data <strong>0</strong></li></ul>
    </div>
  );

  return (
    <div>
      <div className="statusbar" role="img" aria-label="Status distribution">
        {keys.map((k) => (
          <span
            key={k}
            className={`statusbar-seg seg-${k}`}
            style={{ width: `${(counts[k] / all) * 100}%` }}
            title={`${k}: ${counts[k]}`}
          />
        ))}
      </div>
      <ul className="legend">
        {keys.map((k) => (
          <li key={k}>
            <span className={`legend-dot seg-${k}`} />
            {k} <strong>{counts[k] || 0}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
