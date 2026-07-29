import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Globe2, Save, ShieldAlert } from "lucide-react";
import { shieldApi } from "../services/api.js";

export default function TargetPage({ data, refresh }) {
  const targetConfig = data.target || {};
  const [url, setUrl] = useState(targetConfig.target || "");
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(targetConfig.target || "");
  }, [targetConfig.target]);

  async function checkTarget() {
    setStatus({ kind: "loading", message: "Checking target…" });
    try {
      const result = await shieldApi.checkTarget();
      setStatus({ kind: result.reachable ? "success" : "error", message: result.reachable ? `Reachable (HTTP ${result.status})` : result.error });
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    }
  }

  async function saveTarget(event) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "loading", message: "Saving target…" });
    try {
      await shieldApi.updateTarget(url.trim(), adminToken.trim());
      setAdminToken("");
      setStatus({ kind: "success", message: "Target saved. Gateway traffic now uses this site." });
      await refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel target-panel full-width">
    <div className="panel-title">
      <div><h2><Globe2 size={16} /> Protected target site</h2><p>Choose the public HTTP/HTTPS site that the Layer 7 Gateway will protect.</p></div>
      <span className={targetConfig.internal ? "target-badge demo" : "target-badge external"}>{targetConfig.internal ? "Included app" : "External site"}</span>
    </div>
    <form className="target-form" onSubmit={saveTarget}>
      <label>Target URL<input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://site.example" /></label>
      <label>Admin token<input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} placeholder="Required in production" autoComplete="off" /></label>
      <div className="target-actions"><button className="primary-button" type="submit" disabled={saving}><Save size={15} /> {saving ? "Saving…" : "Save target"}</button><button className="secondary-button" type="button" onClick={checkTarget}><CheckCircle2 size={15} /> Check target</button></div>
    </form>
    <div className="target-info"><span><strong>Active:</strong> <code>{targetConfig.target || "Unavailable"}</code></span><span><strong>Database:</strong> {targetConfig.database || "MongoDB"}</span>{targetConfig.target && <a href={targetConfig.target} target="_blank" rel="noreferrer">Open target <ExternalLink size={13} /></a>}</div>
    {status && <div className={`target-status ${status.kind}`} role="status">{status.kind === "error" ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />} {status.message}</div>}
    <p className="target-note">Only public targets are accepted in production. The Gateway applies rate limit, delay, queue and drop decisions before proxying requests; the target site does not need AvailabilityShield code.</p>
  </section>;
}
