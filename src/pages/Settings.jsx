import { useState } from "react";
import { Sun, Moon, RefreshCw } from "lucide-react";
import { useApiContext } from "../api/ApiContext.jsx";
import { apiFetch } from "../api/client.js";
import { DEFAULT_BASE_URL, normalizeBaseUrl } from "../config.js";
import { PageHeader, Panel, Field, useToast } from "../components/ui.jsx";

export default function Settings() {
  const { baseUrl, setBaseUrl, theme, setTheme, autoRefresh, setAutoRefresh } = useApiContext();
  const toast = useToast();
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [testState, setTestState] = useState(null);

  const testConnection = async () => {
    setTestState("testing");
    const url = normalizeBaseUrl(urlInput) || DEFAULT_BASE_URL;
    try {
      await apiFetch("/agents", { signal: AbortSignal.timeout(5000) });
      setTestState("ok");
    } catch (e) {
      setTestState("fail");
    }
  };

  const save = () => {
    setBaseUrl(urlInput);
    toast("API URL saved", "success");
  };

  const reset = () => {
    setUrlInput(DEFAULT_BASE_URL);
    setBaseUrl(DEFAULT_BASE_URL);
    toast("Reset to default", "info");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure the dashboard connection and preferences."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Settings" }]}
      />

      <div style={{ maxWidth: 560 }}>
        <Panel title="API Connection">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="API Base URL" hint="Include any router prefix. No trailing slash.">
              <input
                className="input"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setTestState(null); }}
                placeholder="http://localhost:8000/task-run-info"
                style={{ fontFamily: "var(--mono)", fontSize: 13 }}
              />
            </Field>

            {testState && (
              <div style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid",
                borderLeftColor: testState === "ok" ? "var(--green)" : testState === "fail" ? "var(--red)" : "var(--amber)",
                background: testState === "ok" ? "var(--green-bg)" : testState === "fail" ? "var(--red-bg)" : "var(--amber-bg)",
                fontSize: 13,
                color: testState === "ok" ? "var(--green)" : testState === "fail" ? "var(--red)" : "var(--amber)",
              }}>
                {testState === "testing" && "Testing connection…"}
                {testState === "ok" && "✓ Connection successful"}
                {testState === "fail" && "✗ Connection failed — check URL and CORS settings"}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={testConnection}>
                <RefreshCw size={13} /> Test Connection
              </button>
              <button className="btn btn-primary" onClick={save}>Save</button>
              <button className="btn" onClick={reset}>Reset to Default</button>
            </div>
          </div>
        </Panel>

        <Panel title="Appearance">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>Theme</div>
                <div className="help">Choose between dark and light mode.</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={`btn${theme === "dark" ? " btn-primary" : ""}`}
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                >
                  <Moon size={13} /> Dark
                </button>
                <button
                  className={`btn${theme === "light" ? " btn-primary" : ""}`}
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                >
                  <Sun size={13} /> Light
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>Auto-Refresh</div>
                <div className="help">Automatically refresh data every 30 seconds.</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13 }}>{autoRefresh ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
