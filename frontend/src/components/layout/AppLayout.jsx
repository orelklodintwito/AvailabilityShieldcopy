import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import Sidebar from "../Sidebar.jsx";

export default function AppLayout({ activeSection, onSelect, online, lastUpdated, loading, error, onRefresh, onReset, children, simulation, simulationActive, onCancelSimulation }) {
  return <div className="app-shell"><Sidebar activeSection={activeSection} onSelect={onSelect} online={online} /><main>
    <header className="topbar"><div><p className="eyebrow">IPS-style Layer 4 + Layer 7 protection</p><h1>{activeSection}</h1><p>Real-time visibility into your protected environment.</p></div>
      <div className="header-actions"><span className="updated">Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</span><button className="icon-button" onClick={onRefresh} aria-label="Refresh"><RefreshCw size={18} className={loading ? "spin" : ""} /></button><button className="secondary-button" onClick={onReset}><RotateCcw size={16} /> Reset metrics</button></div>
    </header>
    {simulationActive && <div className="global-simulator-banner" role="status">
      <span><strong>Simulator active</strong> — all dashboard views are updating live ({simulation?.progress || 0}%)</span>
      <button type="button" className="secondary-button" onClick={onCancelSimulation} disabled={simulation?.status === "cancelling"}>
        {simulation?.status === "cancelling" ? "Cancelling..." : "Cancel simulator"}
      </button>
    </div>}
    {error && <div className="error-banner" role="alert"><AlertTriangle size={18} /> Gateway unavailable: {error}</div>}
    {children}
  </main></div>;
}
