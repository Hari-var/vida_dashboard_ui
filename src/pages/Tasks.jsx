import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fetchTasksPaginated, createTask, updateTask, deleteTask, taskKeys } from "../api/tasks.js";
import { fetchAgents, agentKeys } from "../api/agents.js";
import DataTable from "../components/DataTable.jsx";
import { PageHeader, Panel, StatusBadge, ErrorState, Loading, Modal, Field, ConfirmDialog, useToast } from "../components/ui.jsx";
import { formatDate, formatDuration, toTime } from "../utils/format.js";

const PAGE_SIZE = 20;

function TaskForm({ initial = {}, agents = [], onSave, onCancel, loading }) {
  const [form, setForm] = useState({ task_name: "", agent_id: "", repo_name: "", branch_name: "", task_prompt: "", ...initial });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.task_name.trim()) errs.task_name = "Name is required";
    if (!form.agent_id) errs.agent_id = "Agent is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, agent_id: Number(form.agent_id) });
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Task Name *" error={errors.task_name}>
        <input className={`input${errors.task_name ? " has-error" : ""}`} value={form.task_name} onChange={set("task_name")} placeholder="e.g. Data extraction run" />
      </Field>
      <Field label="Agent *" error={errors.agent_id}>
        <select className={`input${errors.agent_id ? " has-error" : ""}`} value={form.agent_id} onChange={set("agent_id")}>
          <option value="">Select agent…</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.agent_name}</option>)}
        </select>
      </Field>
      <Field label="Repository">
        <input className="input" value={form.repo_name || ""} onChange={set("repo_name")} placeholder="org/repo" />
      </Field>
      <Field label="Branch">
        <input className="input" value={form.branch_name || ""} onChange={set("branch_name")} placeholder="main" />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" />Saving…</> : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: taskKeys.paginated(offset, PAGE_SIZE),
    queryFn: ({ signal }) => fetchTasksPaginated(offset, PAGE_SIZE, signal),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
  });

  const agentsQ = useQuery({ queryKey: agentKeys.all, queryFn: ({ signal }) => fetchAgents(signal), staleTime: 60_000 });

  const createMut = useMutation({
    mutationFn: createTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: taskKeys.all }); setCreateOpen(false); toast("Task created", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateTask(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: taskKeys.all }); setEditTask(null); toast("Task updated", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: taskKeys.all }); setDeleteTarget(null); toast("Task deleted", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const agents = agentsQ.data || [];
  const agentMap = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  const rawTasks = Array.isArray(data) ? data : (data?.items || data?.tasks || []);
  const total = data?.total ?? rawTasks.length;

  const filtered = useMemo(() => {
    return rawTasks.filter((t) => {
      if (statusFilter !== "all" && t.task_status !== statusFilter) return false;
      if (agentFilter !== "all" && String(t.agent_id) !== agentFilter) return false;
      return true;
    });
  }, [rawTasks, statusFilter, agentFilter]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE);

  if (isLoading && !data) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Manage tasks across all agents."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Tasks" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Task
          </button>
        }
      />

      <Panel
        title={`Tasks (${total})`}
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
          onRowClick={(t) => navigate(`/tasks/${t.id}`)}
          defaultSort={{ key: "start_time", dir: "desc" }}
          emptyText="No tasks match these filters."
          columns={[
            { key: "id", label: "ID", width: 60, render: (t) => <span className="mono text-muted">#{t.id}</span> },
            { key: "task_name", label: "Task", render: (t) => <strong>{t.task_name || `Task ${t.id}`}</strong> },
            { key: "agent", label: "Agent", render: (t) => <Link to={`/agents/${t.agent_id}`} onClick={(e) => e.stopPropagation()}>{agentMap[t.agent_id]?.agent_name ?? `Agent ${t.agent_id}`}</Link>, sortValue: (t) => agentMap[t.agent_id]?.agent_name },
            { key: "repo_name", label: "Repository" },
            { key: "branch_name", label: "Branch", render: (t) => t.branch_name ? <code>{t.branch_name}</code> : "—" },
            { key: "task_status", label: "Status", render: (t) => <StatusBadge status={t.task_status} /> },
            { key: "start_time", label: "Started", render: (t) => formatDate(t.start_time), sortValue: (t) => toTime(t.start_time) },
            { key: "duration", label: "Duration", render: (t) => formatDuration(t.start_time, t.end_time) },
            {
              key: "actions", label: "", width: 80,
              render: (t) => (
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditTask(t)} aria-label="Edit"><Pencil size={13} /></button>
                  <button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => setDeleteTarget(t)} aria-label="Delete"><Trash2 size={13} /></button>
                </div>
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

      {createOpen && (
        <Modal title="New Task" onClose={() => setCreateOpen(false)}>
          <TaskForm agents={agents} onSave={(body) => createMut.mutate(body)} onCancel={() => setCreateOpen(false)} loading={createMut.isPending} />
        </Modal>
      )}

      {editTask && (
        <Modal title={`Edit: ${editTask.task_name}`} onClose={() => setEditTask(null)}>
          <TaskForm initial={editTask} agents={agents} onSave={(body) => updateMut.mutate({ id: editTask.id, body })} onCancel={() => setEditTask(null)} loading={updateMut.isPending} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Task"
          message={<>Delete task <strong>{deleteTarget.task_name}</strong>? This cannot be undone.</>}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </>
  );
}
