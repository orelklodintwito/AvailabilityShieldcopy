import { useState } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import SystemHealth from "./components/SystemHealth.jsx";
import { useShieldDashboard } from "./hooks/useShieldDashboard.js";
import OverviewPage from "./pages/OverviewPage.jsx";
import TrafficPage from "./pages/TrafficPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import QueuePage from "./pages/QueuePage.jsx";
import Layer4Page from "./pages/Layer4Page.jsx";
import PolicyPage from "./pages/PolicyPage.jsx";
import SimulatorPage from "./pages/SimulatorPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import TargetPage from "./pages/TargetPage.jsx";

const pageBySection = {
  Dashboard: OverviewPage,
  "Traffic Monitor": TrafficPage,
  Alerts: EventsPage,
  Mitigation: EventsPage,
  Queue: QueuePage,
  "Layer 4": Layer4Page,
  Policies: PolicyPage,
  Reports: ReportsPage,
  Simulator: SimulatorPage,
  Settings: TargetPage,
  "System Health": SystemHealth
};

export default function App() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const { data, loading, error, lastUpdated, loadDashboard, reset } = useShieldDashboard();
  const metrics = data.metrics?.metrics || {};
  const queue = data.metrics?.queue || {};
  const layer4 = data.layer4?.metrics || {};
  const online = data.health?.status === "ok" && !error;

  const viewModel = {
    ...data,
    data,
    lastUpdated,
    metrics,
    queue,
    layer4,
    online,
    loading,
    error,
    refresh: () => loadDashboard(),
    onSimulationComplete: () => loadDashboard(true)
  };

  const Page = pageBySection[activeSection] || OverviewPage;
  const pageProps = { ...viewModel, activeSection, setActiveSection };

  return (
    <AppLayout activeSection={activeSection} onSelect={setActiveSection} online={online} lastUpdated={lastUpdated} loading={loading} error={error} onRefresh={() => loadDashboard()} onReset={reset}>
      <Page {...pageProps} />
    </AppLayout>
  );
}
