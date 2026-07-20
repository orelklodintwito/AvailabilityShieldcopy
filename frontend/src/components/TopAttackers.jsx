import React, { useMemo } from "react";
import { Crosshair } from "lucide-react";

export default function TopAttackers({ logs = [], events = [] }) {
  const attackers = useMemo(() => {
    const totals = new Map();

    [...logs, ...events].forEach((item) => {
      const ip = item.ip || item.sourceIp;
      if (!ip) return;

      const previous = totals.get(ip) || {
        ip,
        requests: 0,
        blocked: 0,
        endpoint: item.endpoint || "—"
      };

      previous.requests += 1;
      previous.endpoint = item.endpoint || previous.endpoint;

      if (["drop", "limit", "delay", "queue"].includes(item.decision)) {
        previous.blocked += 1;
      }

      totals.set(ip, previous);
    });

    return [...totals.values()]
      .sort((a, b) => b.blocked - a.blocked || b.requests - a.requests)
      .slice(0, 5);
  }, [logs, events]);

  const maxRequests = Math.max(...attackers.map((item) => item.requests), 1);

  return (
    <section className="panel attackers-panel">
      <div className="panel-title">
        <div>
          <h2>Top Sources</h2>
          <p>Most active or mitigated source addresses</p>
        </div>
        <Crosshair size={19} />
      </div>

      <div className="attackers-list">
        {attackers.map((item, index) => (
          <article className="attacker-row" key={item.ip}>
            <span className="attacker-rank">{index + 1}</span>
            <div className="attacker-main">
              <div>
                <strong>{item.ip}</strong>
                <small>{item.endpoint}</small>
              </div>
              <span>{item.requests} req · {item.blocked} mitigated</span>
              <div className="attacker-bar">
                <i style={{ width: `${(item.requests / maxRequests) * 100}%` }} />
              </div>
            </div>
          </article>
        ))}

        {!attackers.length && (
          <div className="component-empty">
            No source activity has been recorded yet.
          </div>
        )}
      </div>
    </section>
  );
}
