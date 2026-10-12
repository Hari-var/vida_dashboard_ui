import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fetchMetrics, createMetric, updateMetric, deleteMetric, metricKeys } from "../api/metrics.js";
import { fetchAgents, agentKeys } from "../api/agents.js";
import { useApiContext } from "../api/ApiContext.jsx";
import DataTable from "../components/DataTable.jsx";
import { StatusBadge, PageHeader, Panel, ErrorState, Loading, Modal, Field, ConfirmDialog, useToast } from "../components/ui.jsx";

function MetricForm({ initial = {}, agents = [], onSave, onCancel, loading, isEdit }) {
  const [form, setForm] = useState({
    agent_id: "", total_runs: 0, total_success_runs: 0, total_fail_runs: 0,
    agent_status: "idle", avg_run_duration: "", ...initial,
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isEdit && !form.agent_id) errs.agent_id = "Agent is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, agent_id: Number(form.agent_id) });
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!isEdit && (
        <Field label="Agent *" error={errors.agent_id}>
          <select className={`input${errors.agent_id ? " has-error" : ""}`} value={form.agent_id} onChange={set("agent_id")}>
            <option value="">Select agent…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.agent_name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Agent Status">
        <select className="input" value={form.agent_status || "idle"} onChange={set("agent_status")}>
          <option value="idle">Idle</option>
          <option value="running">Running</option>
          <option value="offline">Offline</option>
        </select>
      </Field>
      <div className="grid-2" style={{ gap: 10 }}>
        <Field label="Total Runs">
          <input type="number" className="input" value={form.total_runs || 0} onChange={setNum("total_runs")} min={0} />
        </Field>
        <Field label="Success Runs">
          <input type="number" className="input" value={form.total_success_runs || 0} onChange={setNum("total_success_runs")} min={0} />
        </Field>
        <Field label="Failed Runs">
          <input type="number" className="input" value={form.total_fail_runs || 0} onChange={setNum("total_fail_runs")} min={0} />
        </Field>
        <Field label="Avg Duration (s)">
          <input type="number" className="input" value={form.avg_run_duration || ""} onChange={set("avg_run_duration")} min={0} step="0.01" placeholder="0.00" />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" />Saving…</> : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function Metrics() {
  const qc = useQueryClient();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editMetric, setEditMetric] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: metricKeys.all,
    queryFn: ({ signal }) => fetchMetrics(signal),
    staleTime: 20_000,
  });

  const agentsQ = useQuery({ queryKey: agentKeys.all, queryFn: ({ signal }) => fetchAgents(signal), staleTime: 60_000 });

  const createMut = useMutation({
    mutationFn: createMetric,
    onSuccess: () => { qc.invalidateQueries({ queryKey: metricKeys.all }); setCreateOpen(false); toast("Metrics created", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ agentId, body }) => updateMetric(agentId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: metricKeys.all }); setEditMetric(null); toast("Metrics updated", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (agentId) => deleteMetric(agentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: metricKeys.all }); setDeleteTarget(null); toast("Metrics deleted", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const agents = agentsQ.data || [];
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const metrics = Array.isArray(data) ? data : [];

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Metrics"
        subtitle="Agent performance metrics and statistics."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Metrics" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Add Metrics
          </button>
        }
      />

      <Panel title={`Agent Metrics (${metrics.length})`} flush>
        <DataTable
          rows={metrics}
          defaultSort={{ key: "agent_id", dir: "asc" }}
          columns={[
            { key: "agent_id", label: "Agent ID", width: 80, render: (m) => <span className="mono text-muted">#{m.agent_id}</span> },
            { key: "agent_name", label: "Agent", render: (m) => m.agent?.agent_name || agentMap[m.agent_id]?.agent_name || `Agent ${m.agent_id}` },
            { key: "agent_status", label: "Status", render: (m) => <StatusBadge status={m.agent_status} /> },
            { key: "total_runs", label: "Total Runs", align: "right", render: (m) => m.total_runs ?? "—" },
            { key: "total_success_runs", label: "Success", align: "right", render: (m) => m.total_success_runs ?? "—" },
            { key: "total_fail_runs", label: "Failed", align: "right", render: (m) => m.total_fail_runs ?? "—" },
            { key: "success_rate", label: "Success Rate", align: "right", render: (m) => m.total_runs > 0 ? `${Math.round((m.total_success_runs / m.total_runs) * 100)}%` : "—" },
            {
              key: "actions", label: "", width: 80,
              render: (m) => (
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditMetric(m)} aria-label="Edit"><Pencil size={13} /></button>
                  <button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => setDeleteTarget(m)} aria-label="Delete"><Trash2 size={13} /></button>
                </div>
              ),
            },
          ]}
        />
      </Panel>

      {createOpen && (
        <Modal title="Add Agent Metrics" onClose={() => setCreateOpen(false)}>
          <MetricForm agents={agents} onSave={(body) => createMut.mutate(body)} onCancel={() => setCreateOpen(false)} loading={createMut.isPending} />
        </Modal>
      )}

      {editMetric && (
        <Modal title={`Edit Metrics: ${agentMap[editMetric.agent_id]?.agent_name || `Agent ${editMetric.agent_id}`}`} onClose={() => setEditMetric(null)}>
          <MetricForm isEdit initial={editMetric} agents={agents} onSave={(body) => updateMut.mutate({ agentId: editMetric.agent_id, body })} onCancel={() => setEditMetric(null)} loading={updateMut.isPending} />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Metrics"
          message={<>Delete metrics for <strong>{agentMap[deleteTarget.agent_id]?.agent_name || `Agent ${deleteTarget.agent_id}`}</strong>?</>}
          onConfirm={() => deleteMut.mutate(deleteTarget.agent_id)}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </>
  );
}
