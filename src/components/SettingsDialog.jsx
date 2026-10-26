import { useEffect, useState } from "react";
import { useApiContext } from "../api/ApiContext.jsx";
import { apiFetch } from "../api/client.js";
import { DEFAULT_BASE_URL, normalizeBaseUrl } from "../config.js";
import { X } from "lucide-react";

export default function SettingsDialog({ onClose }) {
  const { baseUrl, setBaseUrl } = useApiContext();
  const [value, setValue] = useState(baseUrl);
  const [test, setTest] = useState({ status: "idle", message: "" });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const runTest = async () => {
    const url = normalizeBaseUrl(value) || DEFAULT_BASE_URL;
    setTest({ status: "busy", message: "Testing…" });
    try {
      const agents = await apiFetch("/agents", { signal: AbortSignal.timeout(5000) });
      setTest({ status: "ok", message: `Connected. ${Array.isArray(agents) ? agents.length : 0} agent(s) found.` });
    } catch (err) {
      setTest({ status: "fail", message: err.message || "Connection failed" });
    }
  };

  const save = () => { setBaseUrl(value); onClose(); };

  const testStyle = {
    padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 13,
    borderLeft: "3px solid",
    ...(test.status === "ok" ? { background: "var(--green-bg)", borderLeftColor: "var(--green)", color: "var(--green)" } :
        test.status === "fail" ? { background: "var(--red-bg)", borderLeftColor: "var(--red)", color: "var(--red)" } :
        { background: "var(--amber-bg)", borderLeftColor: "var(--amber)", color: "var(--amber)" }),
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="settings-title">API Connection</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label" htmlFor="base-url">Base URL</label>
            <input
              id="base-url"
              className="input"
              style={{ fontFamily: "var(--mono)", fontSize: 13 }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="http://vida-admin-craqfpgpdchbbahg.westus3-01.azurewebsites.net/task-run-info"
              autoFocus
            />
            <span className="help">
              Include any router prefix, no trailing slash. Default: <code>{DEFAULT_BASE_URL}</code>
            </span>
          </div>
          {test.status !== "idle" && <div style={testStyle}>{test.message}</div>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={() => setValue(DEFAULT_BASE_URL)}>Reset to default</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={runTest}>Test connection</button>
          <button type="button" className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
