export const sectionRoutes = {
  Alerts: "alerts",
  "Traffic Monitor": "traffic",
  Mitigation: "mitigation",
  Policies: "policies",
  Queue: "queue",
  Reports: "reports",
  Simulator: "simulator",
  Settings: "settings",
  "System Health": "health",
  Dashboard: "dashboard"
};

export function resolveSection(section) {
  return sectionRoutes[section] || sectionRoutes.Dashboard;
}
