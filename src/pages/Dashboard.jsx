import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, ListTodo, Play, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { fetchDashboardSummary, fetchTaskBreakdown, fetchRunBreakdown, dashboardKeys } from "../api/dashboard.js";
import { fetchAgentsWithMetrics, agentKeys } from "../api/agents.js";
import { fetchRecentRuns, runKeys } from "../api/runs.js";
import { useApiContext } from "../api/ApiContext.jsx";
import { StatusBadge, KpiCard, SkeletonKpiGrid, ErrorState, Panel, SkeletonTable } from "../components/ui.jsx";
import DataTable from "../components/DataTable.jsx";
import { formatDate, formatDuration, toTime } from "../utils/format.js";

const STATUS_COLORS = {
  success: "#22c55e", completed: "#22c55e",
  failed: "#ef4444", error: "#ef4444",
  running: "#3b82f6",
  pending: "#f59e0b",
  cancelled: "#64748b", canceled: "#64748b",
};

const getColor = (s) => STATUS_COLORS[(s || "").toLowerCase()] || "#64748b";

// API returns: {"1":{"success":48,"failed":8},"2":{...}} — agent-keyed buckets
// Aggregate all buckets into a single status->count map
function normalizeBreakdown(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((d) => ({
      name: d.status ?? d.task_status ?? d.run_status ?? d.name ?? "unknown",
      value: d.count ?? d.value ?? d.total ?? 0,
    })).filter((d) => d.value > 0);
  }
  const firstVal = Object.values(raw)[0];
  const totals = {};
  if (firstVal !== null && typeof firstVal === "object") {
    for (const bucket of Object.values(raw)) {
      for (const [status, count] of Object.entries(bucket)) {
        if (typeof count === "number") {
          totals[status] = (totals[status] || 0) + count;
        }
      }
    }
  } else {
    for (const [status, count] of Object.entries(raw)) {
      if (typeof count === "number") totals[status] = count;
    }
  }
  return Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
}

function resolveKpi(s, keys) {
  for (const k of keys) {
    const v = s[k];
    if (v != null && typeof v !== "object") {
      if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(1) + "%";
      return String(v);
    }
  }
  return "-";
}

function StatusPieChart({ data }) {
  const chartData = useMemo(() => normalizeBreakdown(data), [data]);
  if (!chartData.length) {
    return <div className="state state-empty" style={{ height: 180 }}>No data available</div>;
  }
  const total = chartData.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {chartData.map((entry, i) => <Cell key={i} fill={getColor(entry.name)} />)}
          </Pie>
          <Tooltip
            formatter={(v, n) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="legend" style={{ justifyContent: "center" }}>
        {chartData.map((d) => (
          <li key={d.name}>
            <span className="legend-dot" style={{ background: getColor(d.name) }} />
            {d.name} <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentBar({ data }) {
  const chartData = useMemo(() =>
    (data || []).slice(0, 8).map((a) => ({
      name: (a.agent_name || `Agent ${a.id}`).slice(0, 14),
      success: a.metrics?.total_success_runs ?? a.total_success_runs ?? 0,
      failed: a.metrics?.total_fail_runs ?? a.total_fail_runs ?? 0,
    })), [data]);
  if (!chartData.length) return <div className="state state-empty">No agents</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink3)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--ink3)" }} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
        <Bar dataKey="success" fill="#22c55e" name="Success" radius={[2, 2, 0, 0]} />
        <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const QUERY_OPTS = { staleTime: 30_000, gcTime: 5 * 60_000 };

// Actual summary keys from API: total_agents, total_tasks, total_runs,
// success_runs, failed_runs, running_now, success_rate
const KPI_DEFS = [
  { label: "Total Agents",    keys: ["total_agents"],                       icon: Bot,         accent: "blue"   },
  { label: "Total Tasks",     keys: ["total_tasks"],                        icon: ListTodo,    accent: "violet" },
  { label: "Total Runs",      keys: ["total_runs"],                         icon: Play,        accent: "blue"   },
  { label: "Successful Runs", keys: ["success_runs", "total_success_runs"], icon: CheckCircle, accent: "green"  },
  { label: "Failed Runs",     keys: ["failed_runs", "total_fail_runs"],     icon: XCircle,     accent: "red"    },
  { label: "Running Now",     keys: ["running_now", "running_runs"],        icon: Clock,       accent: "amber"  },
  { label: "Success Rate",    keys: ["success_rate"],                       icon: TrendingUp,  accent: "cyan"   },
];

export default function Dashboard() {
  const { autoRefresh } = useApiContext();
  const navigate = useNavigate();
  const refetchInterval = autoRefresh ? 30_000 : false;

  const summary    = useQuery({ queryKey: dashboardKeys.summary,       queryFn: ({ signal }) => fetchDashboardSummary(signal),  ...QUERY_OPTS, refetchInterval });
  const taskBreak  = useQuery({ queryKey: dashboardKeys.taskBreakdown, queryFn: ({ signal }) => fetchTaskBreakdown(signal),     ...QUERY_OPTS, refetchInterval });
  const runBreak   = useQuery({ queryKey: dashboardKeys.runBreakdown,  queryFn: ({ signal }) => fetchRunBreakdown(signal),      ...QUERY_OPTS, refetchInterval });
  const agents     = useQuery({ queryKey: agentKeys.withMetrics,       queryFn: ({ signal }) => fetchAgentsWithMetrics(signal), ...QUERY_OPTS, refetchInterval });
  const recentRuns = useQuery({ queryKey: runKeys.recent(8),          queryFn: ({ signal }) => fetchRecentRuns(8, signal),    ...QUERY_OPTS, refetchInterval });

  const s = summary.data || {};

  const displayKpis = useMemo(() => {
    if (!summary.data) return KPI_DEFS.slice(0, 4);
    return KPI_DEFS.filter(({ keys }) => keys.some((k) => k in s));
  }, [summary.data, s]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>AI Operations Dashboard</h1>
          <p>Monitor agents, tasks, executions, performance, and system health.</p>
        </div>
      </div>

      {summary.error && !summary.data && <ErrorState error={summary.error} onRetry={summary.refetch} />}

      {summary.isLoading ? (
        <SkeletonKpiGrid count={4} />
      ) : (
        <div className="kpi-grid">
          {displayKpis.map(({ label, keys, icon, accent }) => (
            <KpiCard key={label} label={label} value={resolveKpi(s, keys)} accent={accent} icon={icon} />
          ))}
        </div>
      )}

      <div className="grid-2">
        <Panel title="Task Status Distribution" actions={<Link to="/tasks" className="btn btn-sm btn-ghost">View all</Link>}>
          {taskBreak.isLoading
            ? <div className="skeleton" style={{ height: 220 }} />
            : taskBreak.error
              ? <ErrorState error={taskBreak.error} onRetry={taskBreak.refetch} />
              : <StatusPieChart data={taskBreak.data} />}
        </Panel>
        <Panel title="Run Status Distribution" actions={<Link to="/runs" className="btn btn-sm btn-ghost">View all</Link>}>
          {runBreak.isLoading
            ? <div className="skeleton" style={{ height: 220 }} />
            : runBreak.error
              ? <ErrorState error={runBreak.error} onRetry={runBreak.refetch} />
              : <StatusPieChart data={runBreak.data} />}
        </Panel>
      </div>

      <div className="grid-main-aside">
        <Panel title="Agent Performance" actions={<Link to="/agents" className="btn btn-sm btn-ghost">View all</Link>}>
          {agents.isLoading
            ? <div className="skeleton" style={{ height: 220 }} />
            : agents.error
              ? <ErrorState error={agents.error} onRetry={agents.refetch} />
              : <AgentBar data={agents.data} />}
        </Panel>

        <Panel title="Recent Runs" actions={<Link to="/runs" className="btn btn-sm btn-ghost">View all</Link>} flush>
          {recentRuns.isLoading
            ? <SkeletonTable rows={6} cols={3} />
            : recentRuns.error
              ? <ErrorState error={recentRuns.error} onRetry={recentRuns.refetch} />
              : (
                <DataTable
                  rows={recentRuns.data || []}
                  pageSize={8}
                  onRowClick={(r) => navigate(`/runs/${r.id}`)}
                  columns={[
                    { key: "id",         label: "Run",      width: 60, render: (r) => <span className="mono">#{r.id}</span> },
                    { key: "run_status", label: "Status",             render: (r) => <StatusBadge status={r.run_status} /> },
                    { key: "start_time", label: "Started",            render: (r) => formatDate(r.start_time), sortValue: (r) => toTime(r.start_time) },
                    { key: "duration",   label: "Duration",           render: (r) => formatDuration(r.start_time, r.end_time) },
                  ]}
                />
              )}
        </Panel>
      </div>
    </>
  );
}
