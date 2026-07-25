import React, { useEffect, useState } from "react";
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

export default function AttackSimulator({ onComplete }) {
  const [scenario, setScenario] = useState("normal");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const response = await shieldApi.simulationStatus();
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
  }, [running, onComplete]);

  const runScenario = async () => {
    if (running) return;

    setRunning(true);
    setResult("");

    setProgress(0);
    try {
      await shieldApi.startSimulation({
        scenario: scenario === "httpFloodDemo" ? "http-flood" : scenario === "heavyAbuseDemo" ? "heavy" : "normal",
        requests: scenarios[scenario].requests,
        concurrency: 4,
        mode: "with-shield"
      });
    } catch (error) {
      setRunning(false);
      setResult(error.message);
    }
  };

  return (
    <section className="panel simulator-panel full-width">
      <div className="panel-title">
        <div>
          <h2>Controlled Lab Simulator</h2>
          <p>Generate a small, bounded request burst against your local gateway only</p>
        </div>
        <FlaskConical size={20} />
      </div>

      <div className="simulator-controls">
        <label>
          <span>Scenario</span>
          <select value={scenario} onChange={(event) => setScenario(event.target.value)} disabled={running}>
            {Object.entries(scenarios).map(([key, item]) => (
              <option value={key} key={key}>{item.label}</option>
            ))}
          </select>
        </label>

        <div className="simulator-description">
          <Activity size={18} />
          <div>
            <strong>{scenarios[scenario].requests} local requests</strong>
            <span>{scenarios[scenario].paths.join(" · ")}</span>
          </div>
        </div>

        <button type="button" className="primary-action" onClick={runScenario} disabled={running}>
          {running ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
          {running ? "Running…" : "Run demo"}
        </button>
      </div>

      {result && <div className="simulator-result">{result}</div>}
    </section>
  );
}
