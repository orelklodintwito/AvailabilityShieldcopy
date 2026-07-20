import React from "react";
import {
  Activity,
  Bell,
  FileText,
  Gauge,
  ListChecks,
  Settings,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";

const items = [
  [Gauge, "Dashboard"],
  [Bell, "Alerts"],
  [Activity, "Traffic Monitor"],
  [ShieldCheck, "Mitigation"],
  [SlidersHorizontal, "Policies"],
  [ListChecks, "Queue"],
  [FileText, "Reports"],
  [Settings, "Settings"]
];

export default function Sidebar({
  activeSection,
  onSelect,
  online
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={24} />
        </div>

        <div>
          <strong>
            Availability<span>Shield</span>
          </strong>

          <small>DDoS Mitigation</small>
        </div>
      </div>

      <nav>
        {items.map(([Icon, label]) => (
          <button
            className={
              activeSection === label
                ? "nav-item active"
                : "nav-item"
            }
            key={label}
            onClick={() => onSelect(label)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="system-chip">
        <span
          className={
            online
              ? "status-dot online"
              : "status-dot offline"
          }
        />

        <div>
          <strong>
            {online ? "Protected" : "Disconnected"}
          </strong>

          <small>System status</small>
        </div>
      </div>
    </aside>
  );
}