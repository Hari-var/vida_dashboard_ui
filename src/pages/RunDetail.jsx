import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRun, runKeys } from "../api/runs.js";
import { fetchTask, taskKeys } from "../api/tasks.js";
import { useApiContext } from "../api/ApiContext.jsx";
import JsonViewer from "../components/JsonViewer.jsx";
import { PageHeader, Panel, StatusBadge, KeyValueList, Tabs, ErrorState, Loading, TextBlock } from "../components/ui.jsx";
import { formatDate, formatDuration } from "../utils/format.js";

export default function RunDetail() {
  const { runId } = useParams();
  const { tick } = useApiContext();
  const [tab, setTab] = useState("result");

  const fmt = (n) => typeof n === "number" ? n.toLocaleString() : "—";

  const run = useQuery({ queryKey: [...runKeys.detail(runId), tick], queryFn: ({ signal }) => fetchRun(runId, signal), staleTime: 20_000 });
  const task = useQuery({
    queryKey: [...taskKeys.detail(run.data?.task_id), tick],
    queryFn: ({ signal }) => fetchTask(run.data.task_id, signal),
    enabled: !!run.data?.task_id,
    staleTime: 60_000,
  });

  if (run.isLoading) return <Loading />;
  if (run.error) return <ErrorState error={run.error} onRetry={run.refetch} />;

  const r = run.data;

  return (
    <>
      <PageHeader
        title={`Run #${r.id}`}
        subtitle={task.data?.task_name}
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Runs", to: "/runs" },
          ...(r.agent_id ? [{ label: `Agent ${r.agent_id}`, to: `/agents/${r.agent_id}` }] : []),
          ...(r.task_id ? [{ label: task.data?.task_name || `Task ${r.task_id}`, to: `/tasks/${r.task_id}` }] : []),
          { label: `Run #${r.id}` },
        ]}
        actions={<StatusBadge status={r.run_status} />}
      />

      <div className="grid-2">
        <Panel title="Run Summary">
          <KeyValueList rows={[
            { label: "Run ID", value: r.id },
            { label: "Agent", value: <Link to={`/agents/${r.agent_id}`}>Agent {r.agent_id}</Link> },
            { label: "Task", value: <Link to={`/tasks/${r.task_id}`}>{task.data?.task_name || `Task ${r.task_id}`}</Link> },
            { label: "Status", value: <StatusBadge status={r.run_status} /> },
            { label: "Started", value: formatDate(r.start_time) },
            { label: "Ended", value: formatDate(r.end_time) },
            { label: "Duration", value: formatDuration(r.start_time, r.end_time) },
            { label: "Log File", value: r.run_logs_path ? <code>{r.run_logs_path}</code> : "—" },
          ]} />
        </Panel>

        <Panel title="Issue" titleExtra={r.issue ? <span className="badge badge-failed" style={{ marginLeft: 8 }}>Error</span> : null}>
          <TextBlock text={r.issue} empty="No issue reported for this run." />
        </Panel>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "result", label: "Result" },
          { id: "raw", label: "Raw Result" },
          { id: "prompt", label: "Run Prompt" },
          ...(r.usage_details ? [{ id: "tokens", label: "Token Usage" }] : []),
        ]}
      />

      {tab === "result" && (
        <Panel title="Run Result" titleExtra={<span className="text-sm text-muted" style={{ marginLeft: 6 }}>JSON</span>}>
          <JsonViewer value={r.run_result} emptyText="No result recorded." />
        </Panel>
      )}
      {tab === "raw" && (
        <Panel title="Raw Run Result" titleExtra={<span className="text-sm text-muted" style={{ marginLeft: 6 }}>JSON</span>}>
          <JsonViewer value={r.raw_run_result} emptyText="No raw result recorded." />
        </Panel>
      )}
      {tab === "prompt" && (
        <Panel title="Run Prompt">
          <TextBlock text={r.run_prompt} empty="No prompt stored for this run." />
        </Panel>
      )}
      {tab === "tokens" && r.usage_details && (
        <Panel title="Token Usage">
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            {[
              { label: "Total Tokens",        key: "total_token_count" },
              { label: "Input Tokens",         key: "input_token_count" },
              { label: "Output Tokens",        key: "output_token_count" },
              { label: "Cache Write",          key: "cache_creation_input_token_count" },
              { label: "Cache Read",           key: "cache_read_input_token_count" },
              { label: "Reasoning Tokens",     key: "reasoning_output_token_count" },
            ].map(({ label, key }) => (
              <div key={key} className="kpi-card">
                <span className="kpi-label">{label}</span>
                <span className="kpi-value">{fmt(r.usage_details[key])}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
