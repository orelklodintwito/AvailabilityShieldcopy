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
import { useSimulationController } from "./hooks/useSimulationController.js";

const ACTIVE_SECTION_KEY = "availabilityshield.activeSection";

function readActiveSection() {
  try {
    return window.localStorage.getItem(ACTIVE_SECTION_KEY) || "Dashboard";
  } catch {
    return "Dashboard";
  }
}

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
  const [activeSection, setActiveSectionState] = useState(readActiveSection);
  const setActiveSection = (section) => {
    setActiveSectionState(section);
    try {
      window.localStorage.setItem(ACTIVE_SECTION_KEY, section);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  };
  const simulationController = useSimulationController();
  const { data, loading, error, lastUpdated, loadDashboard, reset } = useShieldDashboard(simulationController.simulationActive ? 1000 : 5000);
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
    simulation: simulationController.simulation,
    adminToken: simulationController.adminToken,
    simulationError: simulationController.simulationError,
    onAdminTokenChange: simulationController.setAdminToken,
    onStartSimulation: simulationController.startSimulation,
    onCancelSimulation: simulationController.cancelSimulation,
    simulationActive: simulationController.simulationActive
  };

  const Page = pageBySection[activeSection] || OverviewPage;
  const pageProps = { ...viewModel, activeSection, setActiveSection };

  return (
    <AppLayout
      activeSection={activeSection}
      onSelect={setActiveSection}
      online={online}
      lastUpdated={lastUpdated}
      loading={loading}
      error={error}
      onRefresh={() => loadDashboard()}
      onReset={reset}
      simulation={simulationController.simulation}
      simulationActive={simulationController.simulationActive}
      onCancelSimulation={simulationController.cancelSimulation}
    >
      <Page {...pageProps} />
    </AppLayout>
  );
}
