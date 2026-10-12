import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchAgent, fetchAgentRunStats, agentKeys } from "../api/agents.js";
import { fetchTasksByAgent, taskKeys } from "../api/tasks.js";
import { fetchRunsByAgent, runKeys } from "../api/runs.js";
import DataTable from "../components/DataTable.jsx";
import JsonViewer from "../components/JsonViewer.jsx";
import { PageHeader, Panel, StatusBadge, KeyValueList, Tabs, KpiCard, ErrorState, Loading, SkeletonTable } from "../components/ui.jsx";
import { formatDate, formatDuration, percent, countBy, toTime } from "../utils/format.js";
import { CheckCircle, XCircle, Play, TrendingUp } from "lucide-react";

export default function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("tasks");

  const agent    = useQuery({ queryKey: agentKeys.withMetricsDetail(agentId), queryFn: ({ signal }) => fetchAgent(agentId, signal),          staleTime: 20_000 });
  const runStats = useQuery({ queryKey: agentKeys.runStats(agentId),           queryFn: ({ signal }) => fetchAgentRunStats(agentId, signal),   staleTime: 20_000 });
  const tasks    = useQuery({ queryKey: taskKeys.byAgent(agentId),             queryFn: ({ signal }) => fetchTasksByAgent(agentId, signal),    staleTime: 20_000 });
  const runs     = useQuery({ queryKey: runKeys.byAgent(agentId),              queryFn: ({ signal }) => fetchRunsByAgent(agentId, signal),     staleTime: 20_000 });

  if (agent.isLoading) return <Loading />;
  if (agent.error) return <ErrorState error={agent.error} onRetry={agent.refetch} />;

  const a = agent.data;
  const m = a?.metrics || {};
  const runList = runs.data || [];
  const taskList = tasks.data || [];
  const runCounts = countBy(runList, "run_status");
  const finished = (runCounts.success || 0) + (runCounts.failed || 0);

  const statsData = runStats.data;
  const chartData = statsData
    ? Object.entries(statsData).map(([k, v]) => ({ name: k, value: v })).filter((d) => typeof d.value === "number")
    : null;

  return (
    <>
      <PageHeader
        title={a.agent_name}
        subtitle={`Agent #${a.id}`}
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Agents", to: "/agents" }, { label: a.agent_name }]}
        actions={<StatusBadge status={m.agent_status} />}
      />

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Total Runs" value={m.total_runs ?? runList.length} accent="blue" icon={Play} />
        <KpiCard label="Successful" value={m.total_success_runs ?? runCounts.success ?? 0} accent="green" icon={CheckCircle} />
        <KpiCard label="Failed" value={m.total_fail_runs ?? runCounts.failed ?? 0} accent="red" icon={XCircle} />
        <KpiCard label="Success Rate" value={percent(runCounts.success || 0, finished)} accent="violet" icon={TrendingUp} />
      </div>

      <div className="grid-2">
        <Panel title="Agent Details">
          <KeyValueList rows={[
            { label: "Agent ID", value: a.id },
            { label: "Name", value: a.agent_name },
            { label: "Status", value: <StatusBadge status={m.agent_status} /> },
            { label: "Wrapper Prompt", value: a.wrapper_prompt_path ? <code>{a.wrapper_prompt_path}</code> : "—" },
            { label: "Created By", value: a.created_by },
            { label: "Created At", value: formatDate(a.created_at) },
            { label: "Updated By", value: a.updated_by },
            { label: "Updated At", value: formatDate(a.updated_at) },
          ]} />
        </Panel>

        <div className="stack">
          {chartData && chartData.length > 0 && (
            <Panel title="Run Statistics">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink3)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--ink3)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="value" fill="var(--blue)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}
          <Panel title="Required Fields" titleExtra={<span className="text-sm text-muted" style={{ marginLeft: 6 }}>JSON</span>}>
            <JsonViewer value={a.required_fields} emptyText="No required fields defined." />
          </Panel>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "tasks", label: "Tasks", count: taskList.length },
          { id: "runs", label: "Runs", count: runList.length },
        ]}
      />

      {tab === "tasks" && (
        <Panel title={`Tasks (${taskList.length})`} flush>
          {tasks.isLoading ? <SkeletonTable /> :
           tasks.error ? <ErrorState error={tasks.error} onRetry={tasks.refetch} /> : (
            <DataTable
              rows={taskList}
              onRowClick={(t) => navigate(`/tasks/${t.id}`)}
              defaultSort={{ key: "start_time", dir: "desc" }}
              columns={[
                { key: "id", label: "ID", width: 60, render: (t) => <span className="mono text-muted">#{t.id}</span> },
                { key: "task_name", label: "Task", render: (t) => <strong>{t.task_name || `Task ${t.id}`}</strong> },
                { key: "repo_name", label: "Repository" },
                { key: "branch_name", label: "Branch", render: (t) => t.branch_name ? <code>{t.branch_name}</code> : "—" },
                { key: "task_status", label: "Status", render: (t) => <StatusBadge status={t.task_status} /> },
                { key: "start_time", label: "Started", render: (t) => formatDate(t.start_time), sortValue: (t) => toTime(t.start_time) },
              ]}
            />
          )}
        </Panel>
      )}

      {tab === "runs" && (
        <Panel title={`Runs (${runList.length})`} flush>
          {runs.isLoading ? <SkeletonTable /> :
           runs.error ? <ErrorState error={runs.error} onRetry={runs.refetch} /> : (
            <DataTable
              rows={runList}
              onRowClick={(r) => navigate(`/runs/${r.id}`)}
              defaultSort={{ key: "start_time", dir: "desc" }}
              columns={[
                { key: "id", label: "Run", width: 60, render: (r) => <span className="mono">#{r.id}</span> },
                { key: "task", label: "Task", render: (r) => <Link to={`/tasks/${r.task_id}`} onClick={(e) => e.stopPropagation()}>Task {r.task_id}</Link> },
                { key: "run_status", label: "Status", render: (r) => <StatusBadge status={r.run_status} /> },
                { key: "start_time", label: "Started", render: (r) => formatDate(r.start_time), sortValue: (r) => toTime(r.start_time) },
                { key: "duration", label: "Duration", render: (r) => formatDuration(r.start_time, r.end_time) },
              ]}
            />
          )}
        </Panel>
      )}
    </>
  );
}
