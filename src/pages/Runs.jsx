import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { fetchRunsPaginated, deleteRun, runKeys } from "../api/runs.js";
import { fetchAgents, agentKeys } from "../api/agents.js";
import DataTable from "../components/DataTable.jsx";
import { PageHeader, Panel, StatusBadge, ErrorState, Loading, ConfirmDialog, useToast } from "../components/ui.jsx";
import { formatDate, formatDuration, toTime } from "../utils/format.js";

const PAGE_SIZE = 20;

export default function Runs() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: runKeys.paginated(offset, PAGE_SIZE),
    queryFn: ({ signal }) => fetchRunsPaginated(offset, PAGE_SIZE, signal),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });

  const agentsQ = useQuery({ queryKey: agentKeys.all, queryFn: ({ signal }) => fetchAgents(signal), staleTime: 60_000 });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteRun(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: runKeys.all }); setDeleteTarget(null); toast("Run deleted", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const agents = agentsQ.data || [];
  const agentMap = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  const rawRuns = Array.isArray(data) ? data : (data?.items || data?.runs || []);
  const total = data?.total ?? rawRuns.length;

  const filtered = useMemo(() => {
    return rawRuns.filter((r) => {
      if (statusFilter !== "all" && r.run_status !== statusFilter) return false;
      if (agentFilter !== "all" && String(r.agent_id) !== agentFilter) return false;
      return true;
    });
  }, [rawRuns, statusFilter, agentFilter]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE);

  if (isLoading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Runs"
        subtitle="Monitor and manage execution runs."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Runs" }]}
      />

      <Panel
        title={`Runs (${total})`}
        flush
        actions={
          <div className="filters">
            <select className="input" value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setOffset(0); }} aria-label="Filter by agent">
              <option value="all">All agents</option>
              {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.agent_name}</option>)}
            </select>
            <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        }
      >
        <DataTable
          rows={filtered}
          onRowClick={(r) => navigate(`/runs/${r.id}`)}
          defaultSort={{ key: "start_time", dir: "desc" }}
          emptyText="No runs match these filters."
          columns={[
            { key: "id", label: "Run", width: 60, render: (r) => <span className="mono">#{r.id}</span> },
            { key: "agent", label: "Agent", render: (r) => <Link to={`/agents/${r.agent_id}`} onClick={(e) => e.stopPropagation()}>{agentMap[r.agent_id]?.agent_name ?? `Agent ${r.agent_id}`}</Link>, sortValue: (r) => agentMap[r.agent_id]?.agent_name },
            { key: "task", label: "Task", render: (r) => <Link to={`/tasks/${r.task_id}`} onClick={(e) => e.stopPropagation()}>Task {r.task_id}</Link> },
            { key: "run_status", label: "Status", render: (r) => <StatusBadge status={r.run_status} /> },
            { key: "start_time", label: "Started", render: (r) => formatDate(r.start_time), sortValue: (r) => toTime(r.start_time) },
            { key: "duration", label: "Duration", render: (r) => formatDuration(r.start_time, r.end_time) },
            { key: "issue", label: "Issue", render: (r) => r.issue ? <span className="clip">{r.issue}</span> : "—" },
            {
              key: "actions", label: "", width: 50,
              render: (r) => (
                <button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} aria-label="Delete run">
                  <Trash2 size={13} />
                </button>
              ),
            },
          ]}
        />
        {pages > 1 && (
          <div className="pager">
            <span className="text-sm text-muted">Page {currentPage + 1} of {pages} · {total} total</span>
            <div className="pager-btns">
              <button className="btn btn-sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
              <button className="btn btn-sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
            </div>
          </div>
        )}
      </Panel>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Run"
          message={<>Delete run <strong>#{deleteTarget.id}</strong>? This cannot be undone.</>}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </>
  );
}
