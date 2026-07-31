import AttackSimulator from "../components/AttackSimulator.jsx";

export default function SimulatorPage({
  simulation,
  adminToken,
  simulationError,
  onAdminTokenChange,
  onStartSimulation,
  onCancelSimulation
}) {
  return <AttackSimulator
    simulation={simulation}
    adminToken={adminToken}
    simulationError={simulationError}
    onAdminTokenChange={onAdminTokenChange}
    onStart={onStartSimulation}
    onCancel={onCancelSimulation}
  />;
}
