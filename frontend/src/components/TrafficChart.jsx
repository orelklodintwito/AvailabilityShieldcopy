import React from "react";

function points(values, width, height, max) {
  if (!values.length) {
    return "";
  }

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? 0
          : (index / (values.length - 1)) * width;

      const y =
        height -
        (value / Math.max(max, 1)) * height;

      return `${x},${y}`;
    })
    .join(" ");
}

export default function TrafficChart({
  snapshots
}) {
  const ordered = [...snapshots].reverse();

  const totals = ordered.map(
    (item) =>
      item.totalRequests ||
      item.snapshot?.metrics?.totalRequests ||
      0
  );

  const blocked = ordered.map((item) => {
    const decisions =
      item.snapshot?.metrics?.decisions || {};

    return (
      (decisions.drop || 0) +
      (decisions.limit || 0)
    );
  });

  const errors = ordered.map(
    (item) => item.totalErrors || 0
  );

  const max = Math.max(
    ...totals,
    ...blocked,
    ...errors,
    10
  );

  return (
    <section className="panel chart-panel">
      <div className="panel-title">
        <div>
          <h2>Traffic overview</h2>
          <p>Cumulative gateway activity</p>
        </div>

        <div className="legend">
          <span className="legend-total">
            Total
          </span>

          <span className="legend-blocked">
            Mitigated
          </span>

          <span className="legend-errors">
            Errors
          </span>
        </div>
      </div>

      <div className="chart-wrap">
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
          role="img"
          aria-label="Traffic chart"
        >
          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={line}
              x1="0"
              y1={line * 60}
              x2="800"
              y2={line * 60}
              className="grid-line"
            />
          ))}

          <polyline
            points={points(
              totals,
              800,
              220,
              max
            )}
            className="line total-line"
          />

          <polyline
            points={points(
              blocked,
              800,
              220,
              max
            )}
            className="line blocked-line"
          />

          <polyline
            points={points(
              errors,
              800,
              220,
              max
            )}
            className="line error-line"
          />
        </svg>

        {!snapshots.length && (
          <div className="empty-chart">
            Metrics will appear after the gateway
            receives traffic.
          </div>
        )}
      </div>
    </section>
  );
}