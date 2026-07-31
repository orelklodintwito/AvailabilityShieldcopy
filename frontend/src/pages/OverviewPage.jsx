import { Activity, AlertTriangle, Ban, CheckCircle2, Server, ShieldCheck } from "lucide-react";
import StatCard from "../components/StatCard.jsx";
import TrafficChart from "../components/TrafficChart.jsx";
import TrafficByLayer from "../components/TrafficByLayer.jsx";
import TopAttackers from "../components/TopAttackers.jsx";

const number = new Intl.NumberFormat("en-US");

export default function OverviewPage({ metrics, data, queue, layer4, online }) {
  const decisions = metrics.decisions || {};
  const layer4Status = layer4.running ? "Healthy" : layer4.source === "cloud-agent" && layer4.stale ? "Stale" : "Unavailable";
  const mitigated = ["limit", "delay", "queue", "drop"].reduce((sum, key) => sum + (decisions[key] || 0), 0);
  const stats = [
    [ShieldCheck, "Overall status", online ? "Protected" : "Disconnected", online ? "Gateway is reachable" : "Last successful data is shown", online ? "green" : "red"],
    [Activity, "Requests / minute", number.format(metrics.requestsPerMinute || 0), `${metrics.activeRequests || 0} currently active`, "blue"],
    [Ban, "Mitigated", number.format(mitigated), `${number.format(decisions.drop || 0)} dropped`, "red"],
    [AlertTriangle, "Error rate", `${((metrics.errorRate || 0) * 100).toFixed(1)}%`, `${number.format(metrics.totalErrors || 0)} server errors`, "orange"],
    [Server, "Layer 4", layer4Status, `${layer4.stats?.totalTcpSynSeen || 0} SYN observed`, layer4.running ? "green" : "orange"],
    [CheckCircle2, "Queue", number.format(queue.queuedHeavy || 0), `${queue.activeHeavyForwarded || 0} forwarded`, "purple"]
  ];

  return <>
    <section className="stats-grid">{stats.map(([icon, label, value, hint, tone]) => <StatCard key={label} icon={icon} label={label} value={value} hint={hint} tone={tone} />)}</section>
    <section className="overview-dashboard"><div className="overview-traffic"><TrafficChart snapshots={data.snapshots || []} /></div><TrafficByLayer logs={data.logs || []} metrics={{ ...metrics, layer4 }} /><TopAttackers logs={data.logs || []} events={data.events || []} /></section>
  </>;
}
