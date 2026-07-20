import React from "react";

function createPoints(values, width, height, max) {
  if (!values.length) {
    return "";
  }

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width;

      const y =
        height -
        (value / Math.max(max, 1)) * height;

      return `${x},${y}`;
    })
    .join(" ");
}

function createArea(points, width, height) {
  if (!points) {
    return "";
  }

  return `0,${height} ${points} ${width},${height}`;
}

function getSnapshotValue(item, key) {
  return (
    item?.[key] ??
    item?.snapshot?.metrics?.[key] ??
    0
  );
}

export default function TrafficChart({
  snapshots = []
}) {
  const ordered = [...snapshots].reverse();

  const totalRequests = ordered.map((item) =>
    getSnapshotValue(item, "totalRequests")
  );

  const mitigatedRequests = ordered.map((item) => {
    const decisions =
      item?.snapshot?.metrics?.decisions ||
      item?.decisions ||
      {};

    return (
      (decisions.limit || 0) +
      (decisions.delay || 0) +
      (decisions.queue || 0) +
      (decisions.drop || 0)
    );
  });

  const errorRequests = ordered.map((item) =>
    getSnapshotValue(item, "totalErrors")
  );

  const maxValue = Math.max(
    ...totalRequests,
    ...mitigatedRequests,
    ...errorRequests,
    10
  );

  const chartWidth = 800;
  const chartHeight = 220;

  const totalPoints = createPoints(
    totalRequests,
    chartWidth,
    chartHeight,
    maxValue
  );

  const mitigatedPoints = createPoints(
    mitigatedRequests,
    chartWidth,
    chartHeight,
    maxValue
  );

  const errorPoints = createPoints(
    errorRequests,
    chartWidth,
    chartHeight,
    maxValue
  );

  return (
    <section className="panel chart-panel">
      <div className="panel-title chart-panel-title">
        <div>
          <h2>Traffic Overview</h2>
          <p>
            Requests, mitigation actions and errors
            over time
          </p>
        </div>

        <div className="legend">
          <span className="legend-total">
            Total Traffic
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
          viewBox={`0 0 ${chartWidth} 240`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Traffic activity chart"
        >
          <defs>
            <linearGradient
              id="trafficAreaGradient"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#3b82f6"
                stopOpacity="0.35"
              />

              <stop
                offset="100%"
                stopColor="#3b82f6"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((line) => (
            <line
              key={line}
              x1="0"
              y1={line * 55}
              x2={chartWidth}
              y2={line * 55}
              className="grid-line"
            />
          ))}

          {totalPoints && (
            <polygon
              points={createArea(
                totalPoints,
                chartWidth,
                chartHeight
              )}
              className="traffic-area"
            />
          )}

          <polyline
            points={totalPoints}
            className="line total-line"
          />

          <polyline
            points={mitigatedPoints}
            className="line blocked-line"
          />

          <polyline
            points={errorPoints}
            className="line error-line"
          />

          {totalRequests.map((value, index) => {
            if (!totalRequests.length) {
              return null;
            }

            const x =
              totalRequests.length === 1
                ? chartWidth / 2
                : (index /
                    (totalRequests.length - 1)) *
                  chartWidth;

            const y =
              chartHeight -
              (value /
                Math.max(maxValue, 1)) *
                chartHeight;

            return (
              <circle
                key={`point-${index}`}
                cx={x}
                cy={y}
                r="3"
                className="chart-point"
              />
            );
          })}
        </svg>

        {!snapshots.length && (
          <div className="empty-chart">
            <ActivityEmptyState />
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityEmptyState() {
  return (
    <div className="chart-empty-content">
      <strong>No traffic data yet</strong>

      <span>
        Metrics will appear after the gateway
        receives requests.
      </span>
    </div>
  );
}