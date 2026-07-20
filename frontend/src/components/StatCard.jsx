import React from "react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
  trend = "",
  trendDirection = "up"
}) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-header">
        <span className="stat-label">
          {label}
        </span>

        <span className="stat-icon">
          <Icon
            size={18}
            strokeWidth={1.9}
          />
        </span>
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-footer">
        {trend ? (
          <span
            className={`stat-trend stat-trend-${trendDirection}`}
          >
            {trend}
          </span>
        ) : null}

        <span className="stat-hint">
          {hint}
        </span>
      </div>
    </article>
  );
}