import React from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  Server,
  ShieldCheck,
  Wifi
} from "lucide-react";

export default function SystemHealth({ online, health, metrics, lastUpdated }) {
  const totalRequests = metrics?.totalRequests || 0;
  const errorRate = Number(metrics?.errorRate || 0);
  const activeRequests = metrics?.activeRequests || 0;

  const checks = [
    {
      icon: Wifi,
      label: "Gateway",
      value: online ? "Connected" : "Disconnected",
      healthy: online
    },
    {
      icon: Server,
      label: "Protected target",
      value: health?.protectedTarget || "Unavailable",
      healthy: Boolean(health?.protectedTarget)
    },
    {
      icon: Activity,
      label: "Active requests",
      value: String(activeRequests),
      healthy: true
    },
    {
      icon: Database,
      label: "Collected requests",
      value: String(totalRequests),
      healthy: true
    }
  ];

  return (
    <section className="panel system-health-panel full-width">
      <div className="panel-title">
        <div>
          <h2>System Health</h2>
          <p>Live component status and service availability</p>
        </div>

        <span className={online ? "live-pill online-pill" : "live-pill offline-pill"}>
          <span />
          {online ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="health-summary">
        <div className={online ? "health-score healthy" : "health-score unhealthy"}>
          <ShieldCheck size={34} />
          <strong>{online && errorRate < 0.05 ? "Healthy" : "Attention"}</strong>
          <span>Error rate {(errorRate * 100).toFixed(1)}%</span>
        </div>

        <div className="health-checks">
          {checks.map(({ icon: Icon, label, value, healthy }) => (
            <article className="health-check" key={label}>
              <span className={healthy ? "health-check-icon ok" : "health-check-icon bad"}>
                <Icon size={18} />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
              <CheckCircle2 className={healthy ? "check-ok" : "check-bad"} size={16} />
            </article>
          ))}
        </div>
      </div>

      <div className="health-footer">
        Last successful refresh: {lastUpdated ? lastUpdated.toLocaleString() : "Not available"}
      </div>
    </section>
  );
}
