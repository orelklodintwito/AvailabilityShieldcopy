import { useEffect, useRef, useState } from "react";
import { Activity, FlaskConical, LoaderCircle, Play } from "lucide-react";
import { shieldApi } from "../services/api.js";

const scenarios = {
  normal: {
    label: "Normal traffic",
    requests: 8,
    paths: ["/health", "/api/basic"]
  },
  httpFloodDemo: {
    label: "HTTP flood demo",
    requests: 24,
    paths: ["/api/basic", "/api/search"]
  },
  heavyAbuseDemo: {
    label: "Heavy endpoint demo",
    requests: 12,
    paths: ["/api/search", "/api/report", "/api/export"]
  }
};

const SIMULATOR_TOKEN_KEY = "availabilityshield.simulator.adminToken";

function readSessionToken() {
  try {
    return window.sessionStorage.getItem(SIMULATOR_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function saveSessionToken(token) {
  try {
    if (token) window.sessionStorage.setItem(SIMULATOR_TOKEN_KEY, token);
  } catch {
    // Session storage may be unavailable in privacy-restricted browsers.
  }
}

export default function AttackSimulator({ onComplete }) {
  const [scenario, setScenario] = useState("normal");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [progress, setProgress] = useState(0);
  const initialAdminToken = useRef(readSessionToken()).current;
  const [adminToken, setAdminToken] = useState(initialAdminToken);
  const isProductionBuild = import.meta.env.PROD;

  useEffect(() => {
    let active = true;

    // Reconnect to a run that belongs to this browser session after navigation
    // or a refresh. The run itself lives in the Gateway process, not in React.
    shieldApi.simulationStatus(initialAdminToken)
      .then((response) => {
        if (!active) return;
        const simulation = response.simulation || {};
        if (["running", "cancelling"].includes(simulation.status)) {
          setProgress(simulation.progress || 0);
          setRunning(true);
        } else if (["completed", "cancelled", "failed"].includes(simulation.status)) {
          setProgress(simulation.progress || 100);
          setResult(`${simulation.status}: ${simulation.completed || 0}/${simulation.total || 0} requests`);
        }
      })
      .catch(() => {
        // An idle or tokenless production session has no status to restore.
      });

    return () => { active = false; };
  }, [initialAdminToken]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const response = await shieldApi.simulationStatus(adminToken.trim());
        const simulation = response.simulation || {};
        setProgress(simulation.progress || 0);
        if (["completed", "cancelled", "failed"].includes(simulation.status)) {
          setRunning(false);
          setResult(`${simulation.status}: ${simulation.completed || 0}/${simulation.total || 0} requests`);
          onComplete?.();
        }
      } catch (error) {
        setRunning(false);
        setResult(error.message);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [adminToken, running, onComplete]);

  const runScenario = async () => {
    if (running) return;

    setRunning(true);
    setResult("");

    setProgress(0);
    saveSessionToken(adminToken.trim());
    try {
      await shieldApi.startSimulation({
        scenario: scenario === "httpFloodDemo" ? "http-flood" : scenario === "heavyAbuseDemo" ? "heavy" : "normal",
        requests: scenarios[scenario].requests,
        concurrency: 4,
        mode: "with-shield"
      }, adminToken.trim());
    } catch (error) {
      setRunning(false);
      setResult(error.message);
    }
  };

  return (
    <section className="panel simulator-panel full-width">
      <div className="panel-title">
        <div>
          <h2>Controlled Demo Simulator</h2>
          <p>{isProductionBuild ? "Generate a small, bounded burst against the included Protected App only" : "Generate a small, bounded request burst against the local gateway"}</p>
        </div>
        <FlaskConical size={20} />
      </div>

      <p className="simulator-notice">
        {isProductionBuild
          ? "Cloud demo is limited to the included Protected App, requires the admin token, and cannot run against an external site. Leaving this tab or refreshing does not cancel an active run."
          : "Local demo traffic is bounded and is intended only for testing the local Gateway. Leaving this tab or refreshing does not cancel an active run."
      </p>

      <div className="simulator-controls">
        <label>
          <span>Scenario</span>
          <select value={scenario} onChange={(event) => setScenario(event.target.value)} disabled={running}>
            {Object.entries(scenarios).map(([key, item]) => (
              <option value={key} key={key}>{item.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Admin token {isProductionBuild ? "(required on Render)" : "(optional locally)"}</span>
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            placeholder={isProductionBuild ? "Enter SHIELD_ADMIN_TOKEN" : "Optional"}
            autoComplete="off"
            disabled={running}
          />
        </label>

        <div className="simulator-description">
          <Activity size={18} />
          <div>
            <strong>{scenarios[scenario].requests} bounded requests</strong>
            <span>{scenarios[scenario].paths.join(" · ")}</span>
          </div>
        </div>

        <button type="button" className="primary-action" onClick={runScenario} disabled={running}>
          {running ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
          {running ? "Running…" : "Run demo"}
        </button>
      </div>

      {result && <div className="simulator-result">{result}</div>}
      {running && <div className="simulator-progress" role="status">Progress: {progress}%</div>}
    </section>
  );
}
