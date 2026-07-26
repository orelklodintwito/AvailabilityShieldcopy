import TrafficChart from "../components/TrafficChart.jsx";
import TrafficByLayer from "../components/TrafficByLayer.jsx";
import { EmptyState } from "./PageStates.jsx";

export default function TrafficPage({ data, metrics, layer4 }) {
  const endpoints = Object.entries(metrics.byEndpoint || {}).sort((a, b) => b[1].requestCount - a[1].requestCount);
  return <><section className="dashboard-grid"><TrafficChart snapshots={data.snapshots || []} /><TrafficByLayer logs={data.logs || []} metrics={{ ...metrics, layer4 }} /></section><section className="panel table-panel wide full-width"><div className="panel-title"><div><h2>Requests by endpoint</h2><p>Real gateway metrics, not generated sample data</p></div></div><div className="table-scroll"><table><thead><tr><th>Endpoint</th><th>Requests</th><th>Errors</th><th>Average duration</th></tr></thead><tbody>{endpoints.map(([endpoint, value]) => <tr key={endpoint}><td><code>{endpoint}</code></td><td>{value.requestCount}</td><td>{value.errorCount}</td><td>{value.averageDurationMs} ms</td></tr>)}</tbody></table>{!endpoints.length && <EmptyState label="No endpoint traffic has been recorded yet." />}</div></section></>;
}
