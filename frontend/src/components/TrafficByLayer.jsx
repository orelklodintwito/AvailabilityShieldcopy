import React, { useMemo } from "react";
import { Layers3 } from "lucide-react";

export default function TrafficByLayer({ logs = [], metrics = {} }) {
  const values = useMemo(() => {
    const l7 = logs.length || metrics.totalRequests || 0;
    const l4 = Number(metrics.layer4Requests || metrics.connectionCount || 0);
    const other = Number(metrics.otherRequests || 0);
    const total = Math.max(l4 + l7 + other, 1);

    return [
      { label: "Layer 7 HTTP", value: l7, className: "layer-l7", percent: (l7 / total) * 100 },
      { label: "Layer 4 TCP", value: l4, className: "layer-l4", percent: (l4 / total) * 100 },
      { label: "Other", value: other, className: "layer-other", percent: (other / total) * 100 }
    ];
  }, [logs, metrics]);

  return (
    <section className="panel layer-panel">
      <div className="panel-title">
        <div>
          <h2>Traffic by Layer</h2>
          <p>Observed traffic distribution</p>
        </div>
        <Layers3 size={19} />
      </div>

      <div className="layer-donut" style={{
        background: `conic-gradient(#3b82f6 0 ${values[0].percent}%, #9d71ff ${values[0].percent}% ${values[0].percent + values[1].percent}%, #334866 ${values[0].percent + values[1].percent}% 100%)`
      }}>
        <div>
          <strong>{values.reduce((sum, item) => sum + item.value, 0)}</strong>
          <span>Total</span>
        </div>
      </div>

      <div className="layer-legend">
        {values.map((item) => (
          <div key={item.label}>
            <span className={item.className} />
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
