import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { fetchAgentsWithMetrics, createAgent, updateAgent, agentKeys } from "../api/agents.js";
import { useApiContext } from "../api/ApiContext.jsx";
import DataTable from "../components/DataTable.jsx";
import { PageHeader, Panel, StatusBadge, ErrorState, Loading, Modal, Field, useToast } from "../components/ui.jsx";
import { formatDate, toTime } from "../utils/format.js";

function AgentForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ agent_name: "", created_by: "", wrapper_prompt_path: "", ...initial });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.agent_name.trim()) errs.agent_name = "Name is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Agent Name *" error={errors.agent_name}>
        <input className={`input${errors.agent_name ? " has-error" : ""}`} value={form.agent_name} onChange={set("agent_name")} placeholder="e.g. Data Extraction Agent" />
      </Field>
      <Field label="Created By">
        <input className="input" value={form.created_by || ""} onChange={set("created_by")} placeholder="e.g. admin" />
      </Field>
      <Field label="Wrapper Prompt Path">
        <input className="input" value={form.wrapper_prompt_path || ""} onChange={set("wrapper_prompt_path")} placeholder="/prompts/agent.txt" />
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

export default function Agents() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: agentKeys.withMetrics,
    queryFn: ({ signal }) => fetchAgentsWithMetrics(signal),
    staleTime: 20_000,
  });

  const createMut = useMutation({
    mutationFn: createAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: agentKeys.withMetrics }); setCreateOpen(false); toast("Agent created", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateAgent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: agentKeys.withMetrics }); setEditAgent(null); toast("Agent updated", "success"); },
    onError: (e) => toast(e.message, "error"),
  });

  const agents = data || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      const status = (a.metrics?.agent_status || "").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return [a.agent_name, a.created_by, String(a.id)].filter(Boolean).some((s) => s.toLowerCase().includes(q));
    });
  }, [agents, query, statusFilter]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Agents"
        subtitle="Manage and monitor your AI agents."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Agents" }]}
        actions={
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Agent
          </button>
        }
      />

      <Panel
        title={`Agents (${filtered.length}${filtered.length !== agents.length ? ` of ${agents.length}` : ""})`}
        flush
        actions={
          <div className="filters">
            <input className="input search-input" placeholder="Search agents…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="idle">Idle</option>
              <option value="running">Running</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        }
      >
        <DataTable
          rows={filtered}
          onRowClick={(a) => navigate(`/agents/${a.id}`)}
          defaultSort={{ key: "agent_name", dir: "asc" }}
          columns={[
            { key: "id", label: "ID", width: 60, render: (a) => <span className="mono text-muted">#{a.id}</span> },
            { key: "agent_name", label: "Name", render: (a) => <strong>{a.agent_name}</strong> },
            { key: "status", label: "Status", render: (a) => <StatusBadge status={a.metrics?.agent_status} />, sortValue: (a) => a.metrics?.agent_status },
            { key: "runs", label: "Runs", align: "right", render: (a) => a.metrics?.total_runs ?? "—", sortValue: (a) => a.metrics?.total_runs ?? 0 },
            { key: "ok", label: "Success", align: "right", render: (a) => a.metrics?.total_success_runs ?? "—", sortValue: (a) => a.metrics?.total_success_runs ?? 0 },
            { key: "fail", label: "Failed", align: "right", render: (a) => a.metrics?.total_fail_runs ?? "—", sortValue: (a) => a.metrics?.total_fail_runs ?? 0 },
            { key: "created_by", label: "Created By" },
            { key: "created_at", label: "Created", render: (a) => formatDate(a.created_at), sortValue: (a) => toTime(a.created_at) },
            {
              key: "actions", label: "", width: 50,
              render: (a) => (
                <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setEditAgent(a); }} aria-label="Edit agent">
                  <Pencil size={13} />
                </button>
              ),
            },
          ]}
        />
      </Panel>

      {createOpen && (
        <Modal title="New Agent" onClose={() => setCreateOpen(false)}>
          <AgentForm onSave={(body) => createMut.mutate(body)} onCancel={() => setCreateOpen(false)} loading={createMut.isPending} />
        </Modal>
      )}

      {editAgent && (
        <Modal title={`Edit: ${editAgent.agent_name}`} onClose={() => setEditAgent(null)}>
          <AgentForm
            initial={editAgent}
            onSave={(body) => updateMut.mutate({ id: editAgent.id, body })}
            onCancel={() => setEditAgent(null)}
            loading={updateMut.isPending}
          />
        </Modal>
      )}
    </>
  );
}
