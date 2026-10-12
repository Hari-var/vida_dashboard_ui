import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTask, taskKeys } from "../api/tasks.js";
import { fetchRunsByTask, runKeys } from "../api/runs.js";
import { useApiContext } from "../api/ApiContext.jsx";
import DataTable from "../components/DataTable.jsx";
import { PageHeader, Panel, StatusBadge, KeyValueList, ErrorState, Loading, SkeletonTable, TextBlock } from "../components/ui.jsx";
import { formatDate, formatDuration, countBy, toTime } from "../utils/format.js";
import StatusBar from "../components/StatusBar.jsx";

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { tick } = useApiContext();

  const task = useQuery({ queryKey: [...taskKeys.detail(taskId), tick], queryFn: ({ signal }) => fetchTask(taskId, signal), staleTime: 20_000 });
  const runs = useQuery({ queryKey: [...runKeys.byTask(taskId), tick], queryFn: ({ signal }) => fetchRunsByTask(taskId, signal), staleTime: 20_000 });

  if (task.isLoading) return <Loading />;
  if (task.error) return <ErrorState error={task.error} onRetry={task.refetch} />;

  const t = task.data;
  const runList = runs.data || [];
  const runCounts = countBy(runList, "run_status");

  return (
    <>
      <PageHeader
        title={t.task_name || `Task ${t.id}`}
        subtitle={`Task #${t.id}`}
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Tasks", to: "/tasks" },
          { label: t.task_name || `Task ${t.id}` },
        ]}
        actions={<StatusBadge status={t.task_status} />}
      />

      <div className="grid-2">
        <Panel title="Task Details">
          <KeyValueList rows={[
            { label: "Task ID", value: t.id },
            { label: "Agent", value: <Link to={`/agents/${t.agent_id}`}>Agent {t.agent_id}</Link> },
            { label: "Repository", value: t.repo_name || "—" },
            { label: "Branch", value: t.branch_name ? <code>{t.branch_name}</code> : "—" },
            { label: "Status", value: <StatusBadge status={t.task_status} /> },
            { label: "Started", value: formatDate(t.start_time) },
            { label: "Ended", value: formatDate(t.end_time) },
            { label: "Duration", value: formatDuration(t.start_time, t.end_time) },
          ]} />
        </Panel>

        <div className="stack">
          <Panel title="Run Outcomes">
            <StatusBar counts={runCounts} />
          </Panel>
          {t.issue && (
            <Panel title="Issue">
              <TextBlock text={t.issue} />
            </Panel>
          )}
        </div>
      </div>

      {t.task_prompt && (
        <Panel title="Task Prompt">
          <TextBlock text={t.task_prompt} />
        </Panel>
      )}

      <Panel title={`Runs (${runList.length})`} flush>
        {runs.isLoading ? <SkeletonTable /> :
         runs.error ? <ErrorState error={runs.error} onRetry={runs.refetch} /> : (
          <DataTable
            rows={runList}
            onRowClick={(r) => navigate(`/runs/${r.id}`)}
            defaultSort={{ key: "start_time", dir: "desc" }}
            columns={[
              { key: "id", label: "Run", width: 60, render: (r) => <span className="mono">#{r.id}</span> },
              { key: "run_status", label: "Status", render: (r) => <StatusBadge status={r.run_status} /> },
              { key: "start_time", label: "Started", render: (r) => formatDate(r.start_time), sortValue: (r) => toTime(r.start_time) },
              { key: "end_time", label: "Ended", render: (r) => formatDate(r.end_time), sortValue: (r) => toTime(r.end_time) },
              { key: "duration", label: "Duration", render: (r) => formatDuration(r.start_time, r.end_time) },
              { key: "issue", label: "Issue", render: (r) => r.issue ? <span className="clip">{r.issue}</span> : "—" },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
