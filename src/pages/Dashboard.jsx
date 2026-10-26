import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, ListTodo, Play, CheckCircle, XCircle, Clock, TrendingUp, Coins } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { fetchDashboardSummary, fetchTaskBreakdown, fetchRunBreakdown, fetchTokenUsage, dashboardKeys } from "../api/dashboard.js";
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

/* ---------- Layout ----------
   Self-contained auto-fit grids so rows pack evenly and wrap cleanly,
   independent of the global .grid-2 / .grid-main-aside / .kpi-grid rules. */
const GAP = 16;
const gridOf = (min) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap: GAP,
  alignItems: "stretch",
  marginBottom: GAP,
});
const stack = { display: "flex", flexDirection: "column", gap: GAP };
const TOOLTIP_STYLE = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 };
const CHART_HEIGHT = 200;

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
    return <div className="state state-empty" style={{ height: CHART_HEIGHT }}>No data available</div>;
  }
  const total = chartData.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT - 20}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
            {chartData.map((entry, i) => <Cell key={i} fill={getColor(entry.name)} />)}
          </Pie>
          <Tooltip
            formatter={(v, n) => [`${v} (${total ? Math.round((v / total) * 100) : 0}%)`, n]}
            contentStyle={TOOLTIP_STYLE}
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
  if (!chartData.length) return <div className="state state-empty" style={{ height: CHART_HEIGHT }}>No agents</div>;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink3)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--ink3)" }} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
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

const TOKEN_KPIS = [
  { label: "Total Tokens", key: "total_token_count",                 primary: true },
  { label: "Input",        key: "input_token_count" },
  { label: "Output",       key: "output_token_count" },
  { label: "Cache Write",  key: "cache_creation_input_token_count" },
  { label: "Cache Read",   key: "cache_read_input_token_count" },
  { label: "Reasoning",    key: "reasoning_output_token_count" },
];

const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : "0");

/* Token totals — compact strip shown near the top */
function TokenSummary({ query }) {
  const t = query.data?.totals || {};
  return (
    <Panel title="Token Usage" actions={<Coins size={15} style={{ color: "var(--amber)" }} />}>
      {query.isLoading ? (
        <div className="skeleton" style={{ height: 64 }} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))", gap: 12 }}>
          {TOKEN_KPIS.map(({ label, key, primary }) => (
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: primary ? "var(--surface-2, var(--surface))" : "transparent",
                minWidth: 0,
              }}
            >
              <span className="kpi-label">{label}</span>
              <span
                className="kpi-value mono"
                style={{ fontSize: primary ? "1.5rem" : "1.2rem", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {fmtNum(t[key])}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* Per-agent token table — lower priority, stays at the bottom */
// function TokenByAgent({ query }) {
//   const byAgent = query.data?.by_agent || {};
//   const rows = Object.entries(byAgent).filter(([, v]) => v.total_token_count > 0);
//   if (query.isLoading || query.error || !rows.length) return null;
//   return (
//     <Panel title="Token Usage by Agent">
//       <div style={{ overflowX: "auto" }}>
//         <table className="table">
//           <thead>
//             <tr>
//               <th>Agent</th>
//               {TOKEN_KPIS.map(({ label }) => <th key={label} style={{ textAlign: "right" }}>{label}</th>)}
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map(([agentId, v]) => (
//               <tr key={agentId}>
//                 <td><Link to={`/agents/${agentId}`}>Agent {agentId}</Link></td>
//                 {TOKEN_KPIS.map(({ key }) => <td key={key} style={{ textAlign: "right" }} className="mono">{fmtNum(v[key])}</td>)}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </Panel>
//   );
// }

function TokenByAgent({ query, agents }) {
  const byAgent = query.data?.by_agent || {};
  const rows = Object.entries(byAgent).filter(
    ([, v]) => v.total_token_count > 0
  );

  if (query.isLoading || query.error || !rows.length) return null;

  const agentNames = Object.fromEntries(
    (agents || []).map((agent) => [
      String(agent.id),
      agent.agent_name,
    ])
  );

  return (
    <Panel title="Token Usage by Agent">
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              {TOKEN_KPIS.map(({ label }) => (
                <th key={label} style={{ textAlign: "right" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([agentId, v]) => (
              <tr key={agentId}>
                <td>
                  <Link to={`/agents/${agentId}`}>
                    {agentNames[String(agentId)] || `Agent ${agentId}`}
                  </Link>
                </td>
                {TOKEN_KPIS.map(({ key }) => (
                  <td
                    key={key}
                    style={{ textAlign: "right" }}
                    className="mono"
                  >
                    {fmtNum(v[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const { autoRefresh } = useApiContext();
  const navigate = useNavigate();
  const refetchInterval = autoRefresh ? 30_000 : false;

  const summary    = useQuery({ queryKey: dashboardKeys.summary,       queryFn: ({ signal }) => fetchDashboardSummary(signal),  ...QUERY_OPTS, refetchInterval });
  const taskBreak  = useQuery({ queryKey: dashboardKeys.taskBreakdown, queryFn: ({ signal }) => fetchTaskBreakdown(signal),     ...QUERY_OPTS, refetchInterval });
  const runBreak   = useQuery({ queryKey: dashboardKeys.runBreakdown,  queryFn: ({ signal }) => fetchRunBreakdown(signal),      ...QUERY_OPTS, refetchInterval });
  const agents     = useQuery({ queryKey: agentKeys.withMetrics,       queryFn: ({ signal }) => fetchAgentsWithMetrics(signal), ...QUERY_OPTS, refetchInterval });
  const recentRuns = useQuery({ queryKey: runKeys.recent(8),          queryFn: ({ signal }) => fetchRecentRuns(8, signal),    ...QUERY_OPTS, refetchInterval });
  const tokenUsage = useQuery({ queryKey: dashboardKeys.tokenUsage,   queryFn: ({ signal }) => fetchTokenUsage(signal),       ...QUERY_OPTS, refetchInterval });

  const displayKpis = useMemo(() => {
    const s = summary.data;
    if (!s) return KPI_DEFS.slice(0, 4);
    return KPI_DEFS.filter(({ keys }) => keys.some((k) => k in s));
  }, [summary.data]);

  const s = summary.data || {};

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>AI Operations Dashboard</h1>
          <p>Monitor agents, tasks, executions, performance, and system health.</p>
        </div>
      </div>

      {summary.error && !summary.data && <ErrorState error={summary.error} onRetry={summary.refetch} />}

      {/* 1. Headline KPIs */}
      {summary.isLoading ? (
        <SkeletonKpiGrid count={4} />
      ) : (
        <div style={gridOf(150)}>
          {displayKpis.map(({ label, keys, icon, accent }) => (
            <KpiCard key={label} label={label} value={resolveKpi(s, keys)} accent={accent} icon={icon} />
          ))}
        </div>
      )}

      {/* 2. Token usage — moved up, right under the KPIs */}
      <div style={{ marginBottom: GAP }}>
        <TokenSummary query={tokenUsage} />
      </div>

      {/* 3. Charts — three equal panels that wrap together */}
      <div style={gridOf(300)}>
        <Panel title="Task Status" actions={<Link to="/tasks" className="btn btn-sm btn-ghost">View all</Link>}>
          {taskBreak.isLoading
            ? <div className="skeleton" style={{ height: CHART_HEIGHT }} />
            : taskBreak.error
              ? <ErrorState error={taskBreak.error} onRetry={taskBreak.refetch} />
              : <StatusPieChart data={taskBreak.data} />}
        </Panel>

        <Panel title="Run Status" actions={<Link to="/runs" className="btn btn-sm btn-ghost">View all</Link>}>
          {runBreak.isLoading
            ? <div className="skeleton" style={{ height: CHART_HEIGHT }} />
            : runBreak.error
              ? <ErrorState error={runBreak.error} onRetry={runBreak.refetch} />
              : <StatusPieChart data={runBreak.data} />}
        </Panel>

        <Panel title="Agent Performance" actions={<Link to="/agents" className="btn btn-sm btn-ghost">View all</Link>}>
          {agents.isLoading
            ? <div className="skeleton" style={{ height: CHART_HEIGHT }} />
            : agents.error
              ? <ErrorState error={agents.error} onRetry={agents.refetch} />
              : <AgentBar data={agents.data} />}
        </Panel>
      </div>

      {/* 4. Recent runs + per-agent tokens, full width */}
      <div style={stack}>
        <Panel title="Recent Runs" actions={<Link to="/runs" className="btn btn-sm btn-ghost">View all</Link>} flush>
          {recentRuns.isLoading
            ? <SkeletonTable rows={6} cols={4} />
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

        <TokenByAgent
          query={tokenUsage}
          agents={agents.data || []}
        />
      </div>
    </>
  );
}