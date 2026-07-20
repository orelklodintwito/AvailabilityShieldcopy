import React, { useState } from "react";
import { Activity, FlaskConical, LoaderCircle, Play } from "lucide-react";

const BASE_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";

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

  const runScenario = async () => {
    if (running) return;

    setRunning(true);
    setResult("");

    const selected = scenarios[scenario];
    const jobs = Array.from({ length: selected.requests }, (_, index) => {
      const path = selected.paths[index % selected.paths.length];
      return fetch(`${BASE_URL}${path}`, { method: "GET" })
        .then((response) => response.status)
        .catch(() => 0);
    });

    const statuses = await Promise.all(jobs);
    const succeeded = statuses.filter((status) => status >= 200 && status < 500).length;

    setResult(`${selected.label}: ${succeeded}/${selected.requests} requests reached the local gateway.`);
    setRunning(false);

    if (onComplete) {
      window.setTimeout(onComplete, 450);
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
