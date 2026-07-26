export default function PolicyPage({ policy }) {
  const endpoints = Object.entries(policy?.endpoints || {});
  return <section className="panel table-panel wide full-width"><div className="panel-title"><div><h2>Site policy</h2><p>Read-only view of the active mitigation configuration</p></div></div><div className="table-scroll"><table><thead><tr><th>Endpoint</th><th>Type</th><th>Priority</th><th>Rate limit</th><th>High delay</th></tr></thead><tbody>{endpoints.map(([endpoint, value]) => <tr key={endpoint}><td><code>{endpoint}</code></td><td>{value.type}</td><td>{value.priority}</td><td>{value.rateLimitPerMinute || "—"}/min</td><td>{value.delayMsWhenHigh || value.delayMs || 0} ms</td></tr>)}</tbody></table></div></section>;
}
