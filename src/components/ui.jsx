import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, X, CheckCircle, Info } from "lucide-react";
import { useApiContext } from "../api/ApiContext.jsx";

// ===== STATUS BADGE =====
const STATUS_CLASS = {
  success: "badge-success", completed: "badge-success",
  failed: "badge-failed", error: "badge-failed",
  running: "badge-running",
  pending: "badge-pending",
  cancelled: "badge-cancelled", canceled: "badge-cancelled",
  idle: "badge-idle", active: "badge-active", online: "badge-idle",
  offline: "badge-offline", inactive: "badge-offline",
};

export function StatusBadge({ status }) {
  const val = (status || "unknown").toLowerCase();
  return (
    <span className={`badge ${STATUS_CLASS[val] || "badge-unknown"}`} aria-label={`Status: ${val}`}>
      <span className="badge-dot" aria-hidden="true" />
      {val}
    </span>
  );
}

// ===== PAGE HEADER =====
export function PageHeader({ title, subtitle, actions, crumbs }) {
  return (
    <>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </>
  );
}

// ===== BREADCRUMBS =====
export function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="crumb" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {i < items.length - 1 && <span className="crumb-sep">/</span>}
        </span>
      ))}
    </nav>
  );
}

// ===== PANEL =====
export function Panel({ title, actions, children, flush = false, titleExtra }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <div className="panel-head">
          <div className="panel-title">
            {title}
            {titleExtra}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      <div className={flush ? "panel-body flush" : "panel-body"}>{children}</div>
    </section>
  );
}

// ===== KPI CARD =====
export function KpiCard({ label, value, hint, accent = "blue", icon: Icon, loading }) {
  if (loading) return <div className={`kpi-card accent-${accent} skeleton skeleton-kpi`} />;
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {Icon && <div className="kpi-icon"><Icon size={16} /></div>}
      </div>
      <div className="kpi-value">{value ?? "—"}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

// ===== STAT (legacy compat) =====
export function Stat({ label, value, hint, tone = "blue" }) {
  return <KpiCard label={label} value={value} hint={hint} accent={tone} />;
}

// ===== TABS =====
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          className={active === tab.id ? "tab active" : "tab"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count != null && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ===== LOADING =====
export function Loading({ label = "Loading…" }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// ===== ERROR STATE =====
export function ErrorState({ error, onRetry }) {
  const { baseUrl } = useApiContext();
  const notFound = error?.status === 404;
  return (
    <div className="state-error" role="alert">
      <strong>{notFound ? "Not found" : "Could not load data"}</strong>
      <p>{error?.message || "Unknown error"}</p>
      {!notFound && (
        <p className="state-hint">
          Check that the API is running at <code>{baseUrl}</code> and CORS allows this origin.
        </p>
      )}
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry} style={{ marginTop: 4 }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ===== EMPTY =====
export function Empty({ children = "No records found." }) {
  return <div className="state state-empty">{children}</div>;
}

// ===== ASYNC =====
export function Async({ state, children, skeleton }) {
  const { refresh } = useApiContext();
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={refresh} />;
  if (!state.data) return skeleton || <Loading />;
  return children(state.data);
}

// ===== KEY VALUE LIST =====
export function KeyValueList({ rows }) {
  return (
    <dl className="kvlist">
      {rows.map((row) => (
        <div className="kvlist-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// ===== TEXT BLOCK =====
export function TextBlock({ text, empty = "Nothing recorded." }) {
  if (!text) return <Empty>{empty}</Empty>;
  return <pre className="textblock">{text}</pre>;
}

// ===== SKELETON ROWS =====
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" style={{ marginBottom: 1 }} />
      ))}
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-kpi" />
      ))}
    </div>
  );
}

// ===== MODAL =====
export function Modal({ title, onClose, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ===== CONFIRM DIALOG =====
export function ConfirmDialog({ title, message, onConfirm, onCancel, loading, danger = true }) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={loading}>
          {loading ? <><span className="spinner" />Working…</> : "Confirm"}
        </button>
      </>
    }>
      <p className="confirm-text">{message}</p>
    </Modal>
  );
}

// ===== TOAST =====
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={add}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

const TOAST_ICONS = { success: CheckCircle, error: AlertCircle, info: Info };

export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(({ id, msg, type }) => {
        const Icon = TOAST_ICONS[type] || Info;
        return (
          <div key={id} className={`toast toast-${type}`} role="status">
            <Icon size={16} style={{ flex: "none", color: type === "success" ? "var(--green)" : type === "error" ? "var(--red)" : "var(--blue)" }} />
            <span style={{ flex: 1 }}>{msg}</span>
            {onDismiss && <button className="icon-btn" onClick={() => onDismiss(id)} aria-label="Dismiss"><X size={14} /></button>}
          </div>
        );
      })}
    </div>
  );
}

// ===== FORM FIELD =====
export function Field({ label, error, children, hint }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      {children}
      {hint && !error && <span className="help">{hint}</span>}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
