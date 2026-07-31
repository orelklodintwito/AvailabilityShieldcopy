import { useState } from "react";
import { Activity, FlaskConical, LoaderCircle, Play, Square } from "lucide-react";
import { isSimulationActive } from "../hooks/useSimulationController.js";

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

export default function AttackSimulator({
  simulation,
  adminToken,
  simulationError,
  onAdminTokenChange,
  onStart,
  onCancel
}) {
  const [scenario, setScenario] = useState("normal");
  const [starting, setStarting] = useState(false);
  const running = isSimulationActive(simulation);
  const isProductionBuild = import.meta.env.PROD;
  const terminal = ["completed", "cancelled", "failed"].includes(simulation?.status);

  const runScenario = async () => {
    if (running || starting) return;
    setStarting(true);
    try {
      await onStart({
        scenario: scenario === "httpFloodDemo" ? "http-flood" : scenario === "heavyAbuseDemo" ? "heavy" : "normal",
        requests: scenarios[scenario].requests,
        concurrency: 4,
        mode: "with-shield"
      }, adminToken);
    } catch {
      // The controller exposes the readable error in the simulator panel.
    } finally {
      setStarting(false);
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
          ? "Cloud demo is limited to the included Protected App, requires the admin token, and cannot run against an external site. The simulator is global: all dashboard views update until it completes or is cancelled."
          : "Local demo traffic is bounded and is intended only for testing the local Gateway. The simulator is global across all dashboard views until it completes or is cancelled."
        }
      </p>

      <div className="simulator-controls">
        <label>
          <span>Scenario</span>
          <select value={scenario} onChange={(event) => setScenario(event.target.value)} disabled={running || starting}>
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
            onChange={(event) => onAdminTokenChange(event.target.value)}
            placeholder={isProductionBuild ? "Enter SHIELD_ADMIN_TOKEN" : "Optional"}
            autoComplete="off"
            disabled={running || starting}
          />
        </label>

        <div className="simulator-description">
          <Activity size={18} />
          <div>
            <strong>{scenarios[scenario].requests} bounded requests</strong>
            <span>{scenarios[scenario].paths.join(" · ")}</span>
          </div>
        </div>

        {running ? (
          <button type="button" className="secondary-button" onClick={onCancel} disabled={simulation.status === "cancelling"}>
            <Square size={16} /> {simulation.status === "cancelling" ? "Cancelling..." : "Cancel simulator"}
          </button>
        ) : (
          <button type="button" className="primary-action" onClick={runScenario} disabled={starting}>
            {starting ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            {starting ? "Starting..." : "Run demo"}
          </button>
        )}
      </div>

      {simulationError && <div className="simulator-result error" role="alert">{simulationError}</div>}
      {terminal && simulation.status !== "idle" && <div className="simulator-result">{simulation.status}: {simulation.completed || 0}/{simulation.total || 0} requests</div>}
      {running && <div className="simulator-progress" role="status">Global simulator active · Progress: {simulation.progress || 0}% · {simulation.completed || 0}/{simulation.total || 0} requests</div>}
    </section>
  );
}
