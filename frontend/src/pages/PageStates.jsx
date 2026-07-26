export function LoadingState({ label = "Loading live data…" }) {
  return <section className="panel full-width component-empty" role="status">{label}</section>;
}

export function EmptyState({ label = "No data available yet." }) {
  return <div className="component-empty">{label}</div>;
}
