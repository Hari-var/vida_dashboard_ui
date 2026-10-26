import { useEffect, useRef, useState } from "react";
import "./overview.css";

const BASE = "https://devops-agents.com/api/v1"; // dummy base URL

const pretty = (s) =>
  s.split("_").map((w) => ({ kv: "Key Vault", ado: "ADO", tf: "Terraform" }[w] || w[0].toUpperCase() + w.slice(1))).join(" ");

const AGENTS = [
  {
    id: "orchestrator", name: "DevOps Orchestrator", was: "Co-ordinator agent", color: "#8b5cf6", role: "Orchestrator",
    desc: "Single front door. Connects to every agent, picks the right ones for your request and combines their results.",
    tools: ["Pipeline Composer", "GitHub Ops", "Infra Builder", "Auto-Heal", "Azure DevOps Ops"],
    toolKind: "Connected agents", path: "/agents/orchestrator", ms: 142,
    body: { agents: ["github", "yaml"] },
    prompt: "Create a CI pipeline for my repo and push it to the main branch",
    reply: { status: "completed", summary: "Generated ci.yml and committed it to main.", agents_used: ["yaml", "github"] },
  },
  {
    id: "autoheal", name: "Auto-Heal", was: "Self-healing agent", color: "#10b981", role: "Resilience",
    desc: "Diagnoses failed runs, scores the likely fixes by confidence and applies the best one. Works with GitHub, Azure DevOps, Terraform and YAML agents, or on its own.",
    tools: ["Delegate to GitHub Ops", "Delegate to Pipeline Composer", "Delegate to Infra Builder", "Delegate to Azure DevOps Ops", "Fix Analyzer (confidence score)"],
    toolKind: "Capabilities", path: "/agents/auto-heal", ms: 310,
    body: { auto_apply: true },
    prompt: "Pipeline run #482 failed on the terraform plan step. Fix it.",
    reply: {
      status: "healed", root_cause: "Provider version constraint conflict",
      candidates: [{ fix: "Pin azurerm to ~> 3.100", confidence: 0.91 }, { fix: "Re-run with cleared cache", confidence: 0.42 }],
      applied: "Pin azurerm to ~> 3.100",
    },
  },
  {
    id: "github", name: "GitHub Ops", was: "GitHub agent", color: "#3b82f6", role: "Specialist",
    desc: "Manages repositories, workflows, secrets, pull requests, issues and releases on GitHub.",
    tools: ["get_user", "monitor_workflows", "dispatch_workflow", "commit_files", "read_file", "set_secret", "list_branches", "create_branch", "list_commits", "list_workflows", "create_pull_request", "create_issue", "create_release"].map(pretty),
    toolKind: "Tools", path: "/agents/github", ms: 96,
    prompt: "Open a pull request from feature/login into main",
    reply: { status: "completed", summary: "Pull request #57 created.", url: "https://github.com/acme/app/pull/57" },
  },
  {
    id: "ado", name: "Azure DevOps Ops", was: "ADO agent", color: "#0ea5e9", role: "Specialist",
    desc: "Handles projects, repos, pipelines, work items and logs, and syncs secrets between Key Vault, pipelines and GitHub.",
    tools: ["create_project", "list_projects", "create_repo", "init_repo", "list_repos", "list_branches", "create_branch", "list_commits", "read_file", "commit_file", "create_pull_request", "list_pipelines", "run_pipeline", "get_pipeline_run", "create_work_item", "get_work_item", "set_pipeline_variable", "sync_kv_secret_to_pipeline_variable", "dispatch_pipeline", "approve_pipeline_run", "list_pipeline_runs", "get_pipeline_logs", "get_build_timeline", "create_pipeline", "find_files", "list_keyvault_secrets", "sync_secret_to_keyvault", "sync_secret_to_github_repo", "sync_secret_to_github_org", "sync_kv_to_github_repo_variable", "sync_kv_to_github_org_variable", "list_github_repo_secrets", "list_github_org_secrets"].map(pretty),
    toolKind: "Tools", path: "/agents/ado", ms: 118,
    prompt: "Run the deploy-prod pipeline and show me the latest status",
    reply: { status: "running", run_id: 1043, pipeline: "deploy-prod", stage: "Build" },
  },
  {
    id: "terraform", name: "Infra Builder", was: "Terraform agent", color: "#a855f7", role: "Specialist",
    desc: "Generates Terraform modules from a plain-language description of the infrastructure you need.",
    tools: ["Terraform Module Builder"], toolKind: "Tools", path: "/agents/terraform", ms: 204,
    prompt: "Build a module for an Azure storage account with private endpoint",
    reply: { status: "completed", module: "storage-private", files: ["main.tf", "variables.tf", "outputs.tf"] },
  },
  {
    id: "yaml", name: "Pipeline Composer", was: "YAML agent", color: "#f59e0b", role: "Specialist",
    desc: "Writes pipeline YAML for CI, CD, Terraform deployments or any custom workflow.",
    tools: ["CI Pipeline Builder", "CD Pipeline Builder", "Terraform Pipeline Builder", "Generic YAML Builder"],
    toolKind: "Tools", path: "/agents/yaml", ms: 88,
    prompt: "Create a CD pipeline that deploys to staging, then production after approval",
    reply: { status: "completed", file: "cd.yml", stages: ["staging", "production"] },
  },
];
const byId = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

const MODES = [
  ["Use one agent", "Call any agent directly. Auto-Heal works as its own service, with or without its connected agents."],
  ["Mix and match", "Ask the orchestrator to use only the agents you list, for example GitHub Ops with Pipeline Composer."],
  ["Run the full flow", "Send the request to the orchestrator and let it choose agents and call Auto-Heal when something fails."],
];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const copy = async (text) => { try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ } };

function CopyBlock({ label, text }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ov-code">
      <div className="ov-code-head">
        <span className="text-muted">{label}</span>
        <button className="btn btn-sm" onClick={async () => { await copy(text); setDone(true); setTimeout(() => setDone(false), 1200); }}>
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

const W = 900, H = 440, HW = 84, HH = 28;
const HOME = { orchestrator: [450, 56], autoheal: [450, 214], github: [120, 372], ado: [320, 372], terraform: [580, 372], yaml: [780, 372] };
const EDGES = [
  ["orchestrator", "autoheal"], ["orchestrator", "github"], ["orchestrator", "ado"], ["orchestrator", "terraform"], ["orchestrator", "yaml"],
  ["autoheal", "github"], ["autoheal", "ado"], ["autoheal", "terraform"], ["autoheal", "yaml"],
];
const REST = EDGES.map(([a, b]) => Math.hypot(HOME[a][0] - HOME[b][0], HOME[a][1] - HOME[b][1]));
const startPts = () => Object.fromEntries(Object.entries(HOME).map(([k, [x, y]]) => [k, { x, y }]));
const zero = () => Object.fromEntries(Object.keys(HOME).map((k) => [k, { x: 0, y: 0 }]));

// Point where a line from the node centre toward (tx, ty) leaves the node box.
const clip = (n, tx, ty, gap = 3) => {
  const dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1;
  const k = Math.min(HW / (Math.abs(dx) || 1e-6), HH / (Math.abs(dy) || 1e-6), 1);
  return [n.x + dx * k + (dx / d) * gap, n.y + dy * k + (dy / d) * gap];
};

function edgeGeom(i, P) {
  const [a, b] = EDGES[i], pa = P[a], pb = P[b];
  const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
  let cx = (pa.x + pb.x) / 2, cy = (pa.y + pb.y) / 2;
  if (a === "orchestrator" && b !== "autoheal") { // bow outward so lines pass around Auto-Heal
    const side = dx >= 0 ? 1 : -1;
    cx += side * (dy / len) * len * 0.4;
    cy -= side * (dx / len) * len * 0.4;
  }
  const [sx, sy] = clip(pa, cx, cy), [ex, ey] = clip(pb, cx, cy);
  return { d: `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`, r: len / REST[i] };
}

function FlowDiagram({ selected, onSelect }) {
  const [P, setP] = useState(startPts);
  const [snap, setSnap] = useState(true);
  const svgRef = useRef(null);
  const snapRef = useRef(true);
  snapRef.current = snap;
  const sim = useRef({ p: startPts(), v: zero(), drag: null, off: null, down: null, moved: false, last: { x: 0, y: 0 }, raf: 0 });

  // Spring physics: links hold their rest length, nodes repel, optional pull toward home, damped motion.
  const step = () => {
    const s = sim.current, ids = Object.keys(HOME), f = zero();
    EDGES.forEach(([a, b], i) => {
      const dx = s.p[b].x - s.p[a].x, dy = s.p[b].y - s.p[a].y, d = Math.hypot(dx, dy) || 1;
      const k = (0.05 * (d - REST[i])) / d;
      f[a].x += dx * k; f[a].y += dy * k; f[b].x -= dx * k; f[b].y -= dy * k;
    });
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = s.p[ids[i]], B = s.p[ids[j]], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
      if (d < 190) { const k = (0.04 * (190 - d)) / d; f[ids[i]].x -= dx * k; f[ids[i]].y -= dy * k; f[ids[j]].x += dx * k; f[ids[j]].y += dy * k; }
    }
    if (snapRef.current) ids.forEach((id) => { f[id].x += (HOME[id][0] - s.p[id].x) * 0.02; f[id].y += (HOME[id][1] - s.p[id].y) * 0.02; });
    let energy = 0;
    ids.forEach((id) => {
      if (s.drag === id) return;
      const v = s.v[id];
      v.x = (v.x + f[id].x) * 0.86; v.y = (v.y + f[id].y) * 0.86;
      s.p[id].x = clamp(s.p[id].x + v.x, HW, W - HW);
      s.p[id].y = clamp(s.p[id].y + v.y, HH, H - HH);
      energy += v.x * v.x + v.y * v.y;
    });
    setP(Object.fromEntries(ids.map((id) => [id, { ...s.p[id] }])));
    s.raf = energy > 0.001 || s.drag ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!sim.current.raf) sim.current.raf = requestAnimationFrame(step); };
  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);
  useEffect(kick, [snap]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSvg = (e) => {
    const svg = svgRef.current, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  const down = (id) => (e) => {
    const s = sim.current, m = toSvg(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    s.drag = id; s.off = { x: s.p[id].x - m.x, y: s.p[id].y - m.y };
    s.down = { x: e.clientX, y: e.clientY }; s.moved = false; s.last = { x: 0, y: 0 };
    kick();
  };
  const move = (id) => (e) => {
    const s = sim.current;
    if (s.drag !== id) return;
    const m = toSvg(e), nx = clamp(m.x + s.off.x, HW, W - HW), ny = clamp(m.y + s.off.y, HH, H - HH);
    s.last = { x: nx - s.p[id].x, y: ny - s.p[id].y };
    s.p[id] = { x: nx, y: ny };
    if (Math.hypot(e.clientX - s.down.x, e.clientY - s.down.y) > 4) s.moved = true;
  };
  const up = (id) => () => {
    const s = sim.current;
    if (s.drag !== id) return;
    s.drag = null;
    if (!s.moved) onSelect(id); else s.v[id] = { x: s.last.x * 0.6, y: s.last.y * 0.6 };
    kick();
  };
  const reset = () => { const s = sim.current; s.p = startPts(); s.v = zero(); setP(startPts()); };

  return (
    <div className="ov-card ov-flow">
      <div className="ov-toolbar">
        <div>
          <strong>Agent topology</strong>
          <div className="text-muted">Drag any agent. Connected agents follow like they are on springs.</div>
        </div>
        <div className="ov-legend text-muted">
          <span><i className="ov-key ov-key-ctl" />Orchestrator access</span>
          <span><i className="ov-key ov-key-heal" />Auto-Heal access</span>
        </div>
        <div className="ov-actions">
          <button className="btn btn-sm" aria-pressed={snap} onClick={() => setSnap(!snap)}>Snap back: {snap ? "on" : "off"}</button>
          <button className="btn btn-sm" onClick={reset}>Reset layout</button>
        </div>
      </div>
      <div className="ov-canvas">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Agent topology. Orchestrator connects to all agents. Auto-Heal connects to GitHub Ops, Azure DevOps Ops, Infra Builder and Pipeline Composer.">
          <defs>
            <pattern id="ov-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" className="ov-grid-line" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#ov-grid)" />
          {EDGES.map(([a, b], i) => {
            const g = edgeGeom(i, P), heal = a === "autoheal", hot = a === selected || b === selected;
            const w = (heal ? 2.4 : 1.6) / Math.pow(clamp(g.r, 0.8, 3), 0.6);
            return <path key={i} d={g.d} className={"ov-edge " + (heal ? "ov-edge-heal" : "ov-edge-ctl")}
              style={{ "--c": byId[b].color, strokeWidth: hot ? w + 0.8 : w, opacity: hot ? 1 : clamp(1.05 - (g.r - 1) * 0.35, 0.3, 0.85) }} />;
          })}
          {AGENTS.map((a) => (
            <g key={a.id} className={"ov-node" + (selected === a.id ? " is-active" : "")} style={{ "--c": a.color }}
              transform={`translate(${P[a.id].x} ${P[a.id].y})`} tabIndex={0} role="button" aria-label={a.name}
              onPointerDown={down(a.id)} onPointerMove={move(a.id)} onPointerUp={up(a.id)} onPointerCancel={up(a.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(a.id)}>
              <rect x={-HW} y={-HH} width={HW * 2} height={HH * 2} rx="9" />
              <circle cx={-HW + 17} cy="0" r="5" />
              <text x={-HW + 32} y="-3" className="ov-node-name">{a.name}</text>
              <text x={-HW + 32} y="14" className="ov-node-role">{a.role}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Inspector({ id, onSelect, onCall }) {
  const a = byId[id];
  const calls = EDGES.filter(([x]) => x === id).map(([, y]) => y);
  const calledBy = EDGES.filter(([, y]) => y === id).map(([x]) => x);
  const group = (title, ids) => ids.length > 0 && (
    <div className="ov-ins-group">
      <div className="ov-tools-title text-muted">{title}</div>
      <div className="ov-chips">
        {ids.map((i) => <button key={i} className="ov-chip ov-chip-btn" onClick={() => onSelect(i)}>{byId[i].name}</button>)}
      </div>
    </div>
  );
  return (
    <aside className="ov-card ov-inspector" style={{ "--c": a.color }} aria-live="polite">
      <header>
        <span className="ov-dot" />
        <div><h3>{a.name}</h3><span className="text-muted">{a.was} · {a.role}</span></div>
      </header>
      <p>{a.desc}</p>
      {group("Can call", calls)}
      {group("Called by", calledBy)}
      <div className="ov-tools-title text-muted">Endpoint</div>
      <code className="ov-endpoint">POST {a.path}/chat</code>
      <button className="btn btn-sm btn-primary" style={{ marginTop: 14 }} onClick={() => onCall(id)}>How to call it</button>
    </aside>
  );
}

function AgentCard({ a, active, onSelect }) {
  const [all, setAll] = useState(false);
  const shown = all ? a.tools : a.tools.slice(0, 8);
  return (
    <article id={"agent-" + a.id} className={"ov-card" + (active ? " is-active" : "")} style={{ "--c": a.color }}>
      <header>
        <span className="ov-dot" />
        <div>
          <h3>{a.name}</h3>
          <span className="text-muted">{a.was} · {a.role}</span>
        </div>
      </header>
      <p>{a.desc}</p>
      <div className="ov-tools-title text-muted">{a.toolKind} ({a.tools.length})</div>
      <div className="ov-chips">
        {shown.map((t) => <span key={t} className="ov-chip">{t}</span>)}
      </div>
      {a.tools.length > 8 && (
        <button className="btn btn-sm" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${a.tools.length}`}</button>
      )}
      <button className="btn btn-sm btn-primary" style={{ marginTop: 12 }} onClick={() => onSelect(a.id)}>How to call it</button>
    </article>
  );
}

function Communicate({ selected, onSelect }) {
  const a = byId[selected];
  const url = BASE + a.path;
  const body = JSON.stringify({ message: a.prompt, session_id: "demo-session", ...(a.body || {}) }, null, 2);
  const curl = `curl -X POST ${url}/chat \\\n  -H "Authorization: Bearer <YOUR_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  const response = JSON.stringify({ agent: a.id, request_id: "req_8f3a21", ...a.reply }, null, 2);
  return (
    <section id="communicate" className="ov-section">
      <h2>Talk to an agent</h2>
      <p className="text-muted">Pick an agent to see its endpoints and a sample request. Every agent uses the same request format. These addresses are placeholders.</p>
      <div className="ov-tabs" role="tablist">
        {AGENTS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === selected} className={"ov-tab" + (x.id === selected ? " is-active" : "")}
            style={{ "--c": x.color }} onClick={() => onSelect(x.id)}>{x.name}</button>
        ))}
      </div>
      <div className="ov-grid-2">
        <div>
          <table className="ov-endpoints">
            <tbody>
              {[["POST", "/chat", "Send a request"], ["GET", "/tools", "List what it can do"], ["GET", "/health", "Check it is running"]].map(([m, p, d]) => (
                <tr key={p}>
                  <td><span className={"ov-method ov-" + m.toLowerCase()}>{m}</span></td>
                  <td><code>{a.path}{p}</code></td>
                  <td className="text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CopyBlock label="Sample request" text={curl} />
          {a.id === "orchestrator" && <p className="text-muted">Leave out <code>agents</code> to let the orchestrator choose. Include it to limit which agents it may use.</p>}
          {a.id === "autoheal" && <p className="text-muted">Each fix gets a confidence score. Set <code>auto_apply</code> to false to review the best fix before it runs.</p>}
        </div>
        <CopyBlock label="Sample response" text={response} />
      </div>
    </section>
  );
}

export default function Overview() {
  const [selected, setSelected] = useState("orchestrator");
  const total = AGENTS.reduce((n, a) => n + a.tools.length, 0);
  const call = (id) => { setSelected(id); document.getElementById("communicate")?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <div className="ov-root">
      <div className="ov-head">
        <h1>Overview</h1>
        <p className="text-muted">Six agents that build, deploy and repair your DevOps workflows. Use one on its own, combine a few, or run them all through the orchestrator.</p>
      </div>

      <div className="ov-stats">
        {[["Agents", AGENTS.length], ["Tools and capabilities", total], ["Usable on their own", "All"]].map(([l, v]) => (
          <div key={l}><strong>{v}</strong><span className="text-muted">{l}</span></div>
        ))}
      </div>

      <section className="ov-section">
        <div className="ov-head">
          <h2>Architecture</h2>
          <p className="text-muted">The orchestrator reaches every agent. Auto-Heal reaches the four specialists and can also run as a standalone service.</p>
        </div>
        <div className="ov-split">
          <FlowDiagram selected={selected} onSelect={setSelected} />
          <Inspector id={selected} onSelect={setSelected} onCall={call} />
        </div>
      </section>

      <section className="ov-section">
        <div className="ov-head"><h2>Ways to use them</h2></div>
        <div className="ov-grid-3">
          {MODES.map(([t, d]) => <div key={t} className="ov-card"><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="ov-section">
        <div className="ov-head"><h2>Agents</h2></div>
        <div className="ov-grid-3">
          {AGENTS.map((a) => <AgentCard key={a.id} a={a} active={a.id === selected} onSelect={call} />)}
        </div>
      </section>

      <Communicate selected={selected} onSelect={setSelected} />
    </div>
  );
}
