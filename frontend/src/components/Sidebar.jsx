import React from "react";

import {
  Activity,
  Bell,
  FileBarChart3,
  Gauge,
  HeartPulse,
  ListChecks,
  Settings,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    icon: Gauge
  },
  {
    label: "Alerts",
    icon: Bell
  },
  {
    label: "Traffic Monitor",
    icon: Activity
  },
  {
    label: "Mitigation",
    icon: ShieldCheck
  },
  {
    label: "Policies",
    icon: SlidersHorizontal
  },
  {
    label: "Queue",
    icon: ListChecks
  },
  {
    label: "Reports",
    icon: FileBarChart3
  },
  {
    label: "Settings",
    icon: Settings
  },
  {
    label: "System Health",
    icon: HeartPulse
  }
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
          <ShieldCheck
            size={26}
            strokeWidth={2}
          />
        </div>

        <div className="brand-text">
          <strong>
            Availability
            <span>Shield</span>
          </strong>

          <small>
            IPS-Style DDoS Mitigation
          </small>
        </div>
      </div>

      <nav
        className="sidebar-navigation"
        aria-label="Main navigation"
      >
        {navigationItems.map(
          ({ label, icon: Icon }) => (
            <button
              type="button"
              key={label}
              className={
                activeSection === label
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => onSelect(label)}
            >
              <span className="nav-icon">
                <Icon
                  size={18}
                  strokeWidth={1.8}
                />
              </span>

              <span className="nav-label">
                {label}
              </span>
            </button>
          )
        )}
      </nav>

      <div
        className={
          online
            ? "system-chip connected"
            : "system-chip disconnected"
        }
      >
        <span
          className={
            online
              ? "status-dot online"
              : "status-dot offline"
          }
        />

        <div className="system-chip-text">
          <strong>
            {online
              ? "Protected"
              : "Disconnected"}
          </strong>

          <small>
            System Status
          </small>
        </div>
      </div>
    </aside>
  );
}