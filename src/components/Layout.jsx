import { useState, useCallback } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Bot, ListTodo, Play, BarChart2,
  Settings, ChevronLeft, ChevronRight, Menu, X,
  Sun, Moon, RefreshCw, Zap
} from "lucide-react";
import { useApiContext } from "../api/ApiContext.jsx";
import SettingsDialog from "./SettingsDialog.jsx";
import { ToastContainer } from "./ui.jsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/runs", label: "Runs", icon: Play },
  { to: "/metrics", label: "Metrics", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return [{ label: "Dashboard" }];
  return parts.map((part, i) => {
    const to = "/" + parts.slice(0, i + 1).join("/");
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
    return i < parts.length - 1 ? { label, to } : { label };
  });
}

export default function Layout() {
  const { refresh, autoRefresh, setAutoRefresh, theme, setTheme, baseUrl } = useApiContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const crumbs = useBreadcrumbs();

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="app">
      {mobileOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 49 }}
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <div className="shell">
        <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
          <div className="sidebar-header">
            <div className="sidebar-logo">V</div>
            {!collapsed && (
              <span className="sidebar-brand">Vida <span>Console</span></span>
            )}
          </div>

          <nav className="sidebar-nav">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={closeMobile}
                title={collapsed ? label : undefined}
              >
                <Icon className="nav-icon" size={17} />
                {!collapsed && <span className="nav-label">{label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button
              className="sidebar-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header className="topbar">
            <button
              className="icon-btn"
              style={{ display: "none" }}
              id="mobile-menu-btn"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <nav className="topbar-crumb" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={i} className="crumb" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  {i < crumbs.length - 1 && <span className="crumb-sep">/</span>}
                </span>
              ))}
            </nav>

            <div className="topbar-actions">
              <button
                className="icon-btn"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                className={`icon-btn${autoRefresh ? " active" : ""}`}
                onClick={() => setAutoRefresh((a) => !a)}
                aria-label={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
                title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
                style={autoRefresh ? { color: "var(--blue)" } : {}}
              >
                <Zap size={16} />
              </button>

              <button className="btn btn-sm" onClick={refresh} aria-label="Refresh data">
                <RefreshCw size={13} />
                Refresh
              </button>

              <button className="api-pill" onClick={() => setSettingsOpen(true)} title="API settings">
                <span className="api-label">API</span>
                <span className="api-url">{baseUrl}</span>
              </button>
            </div>
          </header>

          <main className="content" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      <ToastContainer />

      <style>{`
        @media (max-width: 900px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
