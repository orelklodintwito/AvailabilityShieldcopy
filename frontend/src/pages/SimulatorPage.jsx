import AttackSimulator from "../components/AttackSimulator.jsx";

export default function SimulatorPage({ onSimulationComplete }) {
  return <AttackSimulator onComplete={onSimulationComplete} />;
}
