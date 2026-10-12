import { useEffect, useMemo, useState } from "react";
import { Empty } from "./ui.jsx";

export default function DataTable({ columns, rows, onRowClick, defaultSort, pageSize = 15, emptyText = "No records found." }) {
  const [sort, setSort] = useState(defaultSort || null);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [rows.length]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = col.sortValue || ((r) => r[col.key]);
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  if (!rows.length) return <Empty>{emptyText}</Empty>;

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * pageSize, (current + 1) * pageSize);
  const toggleSort = (key) => setSort((s) => s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  return (
    <div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th key={col.key} style={{ width: col.width, textAlign: col.align }} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                    <button type="button" className="th-btn" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      {active && <span className="sort-mark">{sort.dir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={onRowClick ? "clickable" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align }}>
                    {col.render ? col.render(row) : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span>Showing {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} of {sorted.length}</span>
          <span className="pager-btns">
            <button type="button" className="btn btn-sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
            <span className="text-muted text-sm">Page {current + 1} of {pages}</span>
            <button type="button" className="btn btn-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}
