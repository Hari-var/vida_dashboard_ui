import { createContext, useContext, useMemo, useState } from "react";
import { Empty } from "./ui.jsx";

// Turns any JSON value into labelled key/value sections.
// Nested objects become collapsible sections, lists of scalars become chips,
// and JSON stored inside strings is expanded automatically.

const ViewerContext = createContext({ force: null });

const isPrimitive = (v) => v === null || v === undefined || typeof v !== "object";

function tryParse(value) {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.parse(t);
    } catch {
      /* plain text that merely looks like JSON */
    }
  }
  return value;
}

function Primitive({ value }) {
  if (value === null || value === undefined) return <span className="jv-null">null</span>;
  if (typeof value === "boolean") return <span className="jv-bool">{String(value)}</span>;
  if (typeof value === "number") return <span className="jv-num">{value}</span>;
  const s = String(value);
  if (s === "") return <span className="jv-null">empty string</span>;
  if (s.includes("\n") || s.length > 140) return <pre className="jv-pre">{s}</pre>;
  return <span className="jv-str">{s}</span>;
}

function Section({ label, meta, depth, children }) {
  const { force } = useContext(ViewerContext);
  const [open, setOpen] = useState(force ?? depth < 2);
  return (
    <div className={`jv-section jv-d${depth % 4}`}>
      <button type="button" className="jv-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="jv-caret">{open ? "▾" : "▸"}</span>
        <span className="jv-label">{label}</span>
        {meta && <span className="jv-meta">{meta}</span>}
      </button>
      {open && <div className="jv-body">{children}</div>}
    </div>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Rows({ entries, depth }) {
  if (!entries.length) return <div className="jv-empty">No fields</div>;
  return (
    <div className="kv">
      {entries.map(([key, val]) => (
        <div className="kv-row" key={key}>
          <div className="kv-key" title={key}>
            {key}
          </div>
          <div className="kv-val">
            <Value value={val} depth={depth} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArrayBody({ items, depth }) {
  if (!items.length) return <span className="jv-null">empty list</span>;
  const parsed = items.map(tryParse);
  if (parsed.every(isPrimitive) && parsed.every((p) => String(p ?? "").length <= 80)) {
    return (
      <div className="chips">
        {parsed.map((p, i) => (
          <span className="chip" key={i}>
            {p === null || p === undefined ? "null" : String(p)}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="jv-stack">
      {parsed.map((item, i) => (
        <Section key={i} label={`Item ${i + 1}`} meta={describe(item)} depth={depth}>
          <Body value={item} depth={depth + 1} />
        </Section>
      ))}
    </div>
  );
}

function describe(v) {
  if (Array.isArray(v)) return plural(v.length, "item");
  if (isPrimitive(v)) return typeof v === "string" ? "text" : typeof v;
  return plural(Object.keys(v).length, "field");
}

// Content of a section: rows for objects, chips/sections for arrays, text for scalars.
function Body({ value, depth }) {
  if (isPrimitive(value)) return <div className="jv-pad"><Primitive value={value} /></div>;
  if (Array.isArray(value)) return <div className="jv-pad"><ArrayBody items={value} depth={depth} /></div>;
  return <Rows entries={Object.entries(value)} depth={depth} />;
}

// A value inside a row.
function Value({ value, depth }) {
  const v = tryParse(value);
  if (isPrimitive(v)) return <Primitive value={v} />;
  if (Array.isArray(v)) {
    const simple = v.map(tryParse).every(isPrimitive);
    if (simple || !v.length) return <ArrayBody items={v} depth={depth} />;
    return (
      <Section label="List" meta={describe(v)} depth={depth}>
        <div className="jv-pad">
          <ArrayBody items={v} depth={depth + 1} />
        </div>
      </Section>
    );
  }
  return (
    <Section label="Object" meta={describe(v)} depth={depth}>
      <Rows entries={Object.entries(v)} depth={depth + 1} />
    </Section>
  );
}

export default function JsonViewer({ value, emptyText = "No data recorded." }) {
  const [mode, setMode] = useState("structured");
  const [force, setForce] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => tryParse(value), [value]);
  const raw = useMemo(() => JSON.stringify(parsed, null, 2), [parsed]);

  if (parsed === null || parsed === undefined) return <Empty>{emptyText}</Empty>;

  const setAll = (open) => {
    setForce(open);
    setNonce((n) => n + 1);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="jv">
      <div className="jv-toolbar">
        <div className="segmented" role="group" aria-label="View mode">
          <button
            type="button"
            className={mode === "structured" ? "seg active" : "seg"}
            onClick={() => setMode("structured")}
          >
            Structured
          </button>
          <button type="button" className={mode === "raw" ? "seg active" : "seg"} onClick={() => setMode("raw")}>
            Raw JSON
          </button>
        </div>
        <div className="jv-tools">
          {mode === "structured" && !isPrimitive(parsed) && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setAll(true)}>
                Expand all
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setAll(false)}>
                Collapse all
              </button>
            </>
          )}
          <button type="button" className="btn btn-sm" onClick={copy}>
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
      </div>
      {mode === "raw" ? (
        <pre className="jv-raw">{raw}</pre>
      ) : (
        <ViewerContext.Provider value={{ force }} key={nonce}>
          {isPrimitive(parsed) ? (
            <div className="jv-pad"><Primitive value={parsed} /></div>
          ) : Array.isArray(parsed) ? (
            <div className="jv-pad"><ArrayBody items={parsed} depth={0} /></div>
          ) : (
            <Rows entries={Object.entries(parsed)} depth={0} />
          )}
        </ViewerContext.Provider>
      )}
    </div>
  );
}
