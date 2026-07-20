import React from "react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue"
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-heading">
        <span>{label}</span>
        <Icon size={18} />
      </div>

      <strong>{value}</strong>

      <small>{hint}</small>
    </article>
  );
}