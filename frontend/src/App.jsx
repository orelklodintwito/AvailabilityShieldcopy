import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users
} from "lucide-react";

import Sidebar from "./components/Sidebar.jsx";
import StatCard from "./components/StatCard.jsx";
import TrafficChart from "./components/TrafficChart.jsx";

import { shieldApi } from "./services/api.js";

const number = new Intl.NumberFormat("en-US");

const safePercent = (value) =>
  `${(Number(value || 0) * 100).toFixed(1)}%`;

const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString()
    : "—";

const decisionClass = (value = "allow") =>
  `badge decision-${value}`;

const severityClass = (value = "normal") =>
  `badge severity-${value}`;

export default function App() {
  const [activeSection, setActiveSection] =
    useState("Dashboard");

  const [data, setData] = useState({
    health: null,
    metrics: null,
    events: [],
    logs: [],
    policy: null,
    snapshots: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState(null);

  const loadDashboard = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setLoading(true);
      }

      try {
        const [
          health,
          metrics,
          events,
          logs,
          policy,
          snapshots
        ] = await Promise.all([
          shieldApi.health(),
          shieldApi.metrics(),
          shieldApi.events(20),
          shieldApi.requests(30),
          shieldApi.policy(),
          shieldApi.snapshots(18)
        ]);

        setData({
          health,
          metrics,
          events: events.events || [],
          logs: logs.logs || [],
          policy,
          snapshots:
            snapshots.snapshots || []
        });

        setLastUpdated(new Date());
        setError("");
      } catch (err) {
        setError(
          err.message ||
            "Could not connect to the gateway"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();

    const timer = setInterval(() => {
      loadDashboard(true);
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [loadDashboard]);

  const reset = async () => {
    try {
      await shieldApi.reset();
      await loadDashboard();
    } catch (err) {
      setError(
        err.message ||
          "Could not reset gateway metrics"
      );
    }
  };

  const metrics =
    data.metrics?.metrics || {};

  const queue =
    data.metrics?.queue || {};

  const decisions =
    metrics.decisions || {};

  const totalMitigated =
    (decisions.limit || 0) +
    (decisions.delay || 0) +
    (decisions.queue || 0) +
    (decisions.drop || 0);

  const online =
    data.health?.status === "ok" && !error;

  const topEndpoints = useMemo(() => {
    return Object.entries(
      metrics.byEndpoint || {}
    )
      .sort(
        (first, second) =>
          second[1].requestCount -
          first[1].requestCount
      )
      .slice(0, 5);
  }, [metrics.byEndpoint]);

  const endpointPolicies = Object.entries(
    data.policy?.endpoints || {}
  );

  const renderStats = () => (
    <section className="stats-grid">
      <StatCard
        icon={ShieldCheck}
        label="Overall status"
        value={
          online ? "Protected" : "Offline"
        }
        hint={
          data.health?.protectedTarget ||
          "Waiting for gateway"
        }
        tone={online ? "green" : "red"}
      />

      <StatCard
        icon={Activity}
        label="Total requests"
        value={number.format(
          metrics.totalRequests || 0
        )}
        hint={`${
          metrics.activeRequests || 0
        } currently active`}
      />

      <StatCard
        icon={Ban}
        label="Mitigated"
        value={number.format(
          totalMitigated
        )}
        hint={`${number.format(
          decisions.drop || 0
        )} dropped`}
        tone="red"
      />

      <StatCard
        icon={AlertTriangle}
        label="Active alerts"
        value={number.format(
          data.events.length
        )}
        hint="Recent security decisions"
        tone="orange"
      />

      <StatCard
        icon={CheckCircle2}
        label="Error rate"
        value={safePercent(
          metrics.errorRate
        )}
        hint={`${number.format(
          metrics.totalErrors || 0
        )} server errors`}
        tone="green"
      />
    </section>
  );

  const renderDecisionDistribution = () => (
    <section className="panel decision-panel">
      <div className="panel-title">
        <div>
          <h2>Decision distribution</h2>
          <p>
            Actions selected by the rule engine
          </p>
        </div>
      </div>

      <div className="decision-list">
        {Object.entries({
          allow: "Allowed",
          limit: "Limited",
          delay: "Delayed",
          queue: "Queued",
          drop: "Dropped",
          alert: "Alerts"
        }).map(([key, label]) => {
          const value =
            decisions[key] || 0;

          const denominator =
            Math.max(
              metrics.totalRequests || 0,
              1
            );

          return (
            <div
              className="decision-row"
              key={key}
            >
              <div>
                <span
                  className={`decision-dot ${key}`}
                />

                <strong>{label}</strong>

                <em>
                  {number.format(value)}
                </em>
              </div>

              <div className="progress">
                <span
                  className={key}
                  style={{
                    width: `${Math.min(
                      100,
                      (value /
                        denominator) *
                        100
                    )}%`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderAlertsTable = (limit = 20) => (
    <section className="panel table-panel wide full-width">
      <div className="panel-title">
        <div>
          <h2>Recent security alerts</h2>
          <p>
            Classification and mitigation events
          </p>
        </div>

        <span>
          {data.events.length} events
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Severity</th>
              <th>Source</th>
              <th>Endpoint</th>
              <th>Decision</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            {data.events
              .slice(0, limit)
              .map((event) => (
                <tr key={event.id}>
                  <td>
                    {time(event.timestamp)}
                  </td>

                  <td>
                    <span
                      className={severityClass(
                        event.severity
                      )}
                    >
                      {event.severity}
                    </span>
                  </td>

                  <td>
                    {event.ip || "—"}
                  </td>

                  <td>
                    <code>
                      {event.endpoint || "—"}
                    </code>
                  </td>

                  <td>
                    <span
                      className={decisionClass(
                        event.decision
                      )}
                    >
                      {event.decision}
                    </span>
                  </td>

                  <td className="reason-cell">
                    {event.reason ||
                      "Rule-engine event"}
                  </td>
                </tr>
              ))}

            {!data.events.length && (
              <tr>
                <td
                  colSpan="6"
                  className="empty-cell"
                >
                  No security events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderQueuePanel = () => (
    <section className="panel queue-panel">
      <div className="panel-title">
        <div>
          <h2>Queue status</h2>
          <p>
            Heavy endpoint concurrency
          </p>
        </div>

        <Users size={20} />
      </div>

      <div className="queue-primary">
        <strong>
          {queue.queuedHeavy || 0}
        </strong>

        <span>
          waiting requests
        </span>
      </div>

      <div className="mini-grid">
        <div>
          <Server size={17} />

          <strong>
            {queue.activeHeavyForwarded || 0}
          </strong>

          <span>Active heavy</span>
        </div>

        <div>
          <Clock3 size={17} />

          <strong>
            {queue.totalQueued || 0}
          </strong>

          <span>Total queued</span>
        </div>

        <div>
          <CheckCircle2 size={17} />

          <strong>
            {queue.totalDequeued || 0}
          </strong>

          <span>Released</span>
        </div>

        <div>
          <Ban size={17} />

          <strong>
            {queue.totalQueueRejected || 0}
          </strong>

          <span>Rejected</span>
        </div>
      </div>
    </section>
  );

  const renderTopEndpoints = () => (
    <section className="panel endpoint-panel">
      <div className="panel-title">
        <div>
          <h2>Top endpoints</h2>
          <p>
            Most requested protected routes
          </p>
        </div>
      </div>

      <div className="endpoint-list">
        {topEndpoints.map(
          ([endpoint, item]) => (
            <div key={endpoint}>
              <code>{endpoint}</code>

              <span>
                {number.format(
                  item.requestCount
                )}{" "}
                requests
              </span>

              <strong>
                {item.averageDurationMs || 0}{" "}
                ms avg
              </strong>
            </div>
          )
        )}

        {!topEndpoints.length && (
          <p className="empty-text">
            Endpoint activity will appear here.
          </p>
        )}
      </div>
    </section>
  );

  const renderPolicyTable = () => (
    <section className="panel policy-panel wide full-width">
      <div className="panel-title">
        <div>
          <h2>Site policy</h2>

          <p>
            {data.policy?.protectedTarget ||
              "Protected target"}
          </p>
        </div>

        <span>
          {endpointPolicies.length} endpoints
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Rate limit / min</th>
              <th>High-load delay</th>
            </tr>
          </thead>

          <tbody>
            {endpointPolicies.map(
              ([endpoint, policy]) => (
                <tr key={endpoint}>
                  <td>
                    <code>
                      {endpoint}
                    </code>
                  </td>

                  <td>
                    <span
                      className={`badge type-${policy.type}`}
                    >
                      {policy.type}
                    </span>
                  </td>

                  <td>
                    {policy.priority}
                  </td>

                  <td>
                    {policy.rateLimitPerMinute}
                  </td>

                  <td>
                    {policy.delayMsWhenHigh
                      ? `${policy.delayMsWhenHigh} ms`
                      : "—"}
                  </td>
                </tr>
              )
            )}

            {!endpointPolicies.length && (
              <tr>
                <td
                  colSpan="5"
                  className="empty-cell"
                >
                  No policy endpoints were loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderRequestLogs = () => (
    <section className="panel table-panel wide full-width">
      <div className="panel-title">
        <div>
          <h2>Request logs</h2>

          <p>
            Latest traffic processed by
            AvailabilityShield
          </p>
        </div>

        <span>
          {data.logs.length} rows
        </span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>IP</th>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Decision</th>
              <th>Severity</th>
            </tr>
          </thead>

          <tbody>
            {data.logs
              .slice(0, 30)
              .map((log) => (
                <tr key={log.id}>
                  <td>
                    {time(log.timestamp)}
                  </td>

                  <td>
                    {log.ip || "—"}
                  </td>

                  <td>{log.method}</td>

                  <td>
                    <code>
                      {log.endpoint}
                    </code>
                  </td>

                  <td>
                    {log.statusCode ?? "—"}
                  </td>

                  <td>
                    {log.durationMs ?? 0} ms
                  </td>

                  <td>
                    <span
                      className={decisionClass(
                        log.decision
                      )}
                    >
                      {log.decision}
                    </span>
                  </td>

                  <td>
                    <span
                      className={severityClass(
                        log.severity
                      )}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}

            {!data.logs.length && (
              <tr>
                <td
                  colSpan="8"
                  className="empty-cell"
                >
                  No request logs yet. Run a
                  simulator to populate the page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDashboard = () => (
    <>
      {renderStats()}

      <section className="dashboard-grid">
        <TrafficChart
          snapshots={data.snapshots}
        />

        {renderDecisionDistribution()}

        {renderAlertsTable(8)}

        {renderQueuePanel()}

        {renderTopEndpoints()}

        {renderPolicyTable()}

        {renderRequestLogs()}
      </section>
    </>
  );

  const renderTrafficMonitor = () => (
    <>
      {renderStats()}

      <section className="dashboard-grid">
        <TrafficChart
          snapshots={data.snapshots}
        />

        {renderTopEndpoints()}

        {renderRequestLogs()}
      </section>
    </>
  );

  const renderMitigation = () => (
    <>
      {renderStats()}

      <section className="dashboard-grid">
        {renderDecisionDistribution()}

        {renderAlertsTable(20)}

        {renderQueuePanel()}
      </section>
    </>
  );

  const renderQueue = () => (
    <section className="dashboard-grid">
      {renderQueuePanel()}

      <section className="panel endpoint-panel">
        <div className="panel-title">
          <div>
            <h2>Queue explanation</h2>
            <p>
              Requests waiting for controlled
              access
            </p>
          </div>
        </div>

        <div className="endpoint-list">
          <div>
            <code>Queued heavy</code>
            <span>
              Requests currently waiting
            </span>
            <strong>
              {queue.queuedHeavy || 0}
            </strong>
          </div>

          <div>
            <code>Total dequeued</code>
            <span>
              Requests released to the server
            </span>
            <strong>
              {queue.totalDequeued || 0}
            </strong>
          </div>

          <div>
            <code>Total rejected</code>
            <span>
              Requests rejected by policy
            </span>
            <strong>
              {queue.totalQueueRejected || 0}
            </strong>
          </div>
        </div>
      </section>
    </section>
  );

  const renderReports = () => (
    <>
      {renderStats()}

      <section className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-title">
            <div>
              <h2>Security report summary</h2>
              <p>
                Current totals from the gateway
              </p>
            </div>

            <FileText size={20} />
          </div>

          <div className="mini-grid">
            <div>
              <Activity size={17} />
              <strong>
                {number.format(
                  metrics.totalRequests || 0
                )}
              </strong>
              <span>Total requests</span>
            </div>

            <div>
              <Ban size={17} />
              <strong>
                {number.format(
                  totalMitigated
                )}
              </strong>
              <span>Mitigated</span>
            </div>

            <div>
              <AlertTriangle size={17} />
              <strong>
                {number.format(
                  data.events.length
                )}
              </strong>
              <span>Security events</span>
            </div>

            <div>
              <CheckCircle2 size={17} />
              <strong>
                {safePercent(
                  metrics.errorRate
                )}
              </strong>
              <span>Error rate</span>
            </div>
          </div>
        </section>

        {renderTopEndpoints()}

        {renderRequestLogs()}
      </section>
    </>
  );

  const renderSettings = () => (
    <section className="dashboard-grid">
      <section className="panel full-width">
        <div className="panel-title">
          <div>
            <h2>System settings</h2>
            <p>
              Frontend connection and refresh
              configuration
            </p>
          </div>

          <Settings size={20} />
        </div>

        <div className="endpoint-list">
          <div>
            <code>Gateway URL</code>
            <span>
              Configured through
              VITE_GATEWAY_URL
            </span>
            <strong>
              {import.meta.env
                .VITE_GATEWAY_URL ||
                "http://localhost:4000"}
            </strong>
          </div>

          <div>
            <code>Automatic refresh</code>
            <span>
              Dashboard refresh interval
            </span>
            <strong>5 seconds</strong>
          </div>

          <div>
            <code>Protected target</code>
            <span>
              Application behind the gateway
            </span>
            <strong>
              {data.health?.protectedTarget ||
                data.policy?.protectedTarget ||
                "Not available"}
            </strong>
          </div>
        </div>
      </section>
    </section>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "Alerts":
        return renderAlertsTable(20);

      case "Traffic Monitor":
        return renderTrafficMonitor();

      case "Mitigation":
        return renderMitigation();

      case "Policies":
        return renderPolicyTable();

      case "Queue":
        return renderQueue();

      case "Reports":
        return renderReports();

      case "Settings":
        return renderSettings();

      case "Dashboard":
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        online={online}
      />

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">
              IPS-style Layer 4 + Layer 7
              protection
            </p>

            <h1>{activeSection}</h1>

            <p>
              Real-time visibility into your
              protected environment.
            </p>
          </div>

          <div className="header-actions">
            <span className="updated">
              Updated{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "—"}
            </span>

            <button
              className="icon-button"
              onClick={() => loadDashboard()}
              aria-label="Refresh"
            >
              <RefreshCw
                size={18}
                className={
                  loading ? "spin" : ""
                }
              />
            </button>

            <button
              className="secondary-button"
              onClick={reset}
            >
              <RotateCcw size={16} />
              Reset metrics
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />

            Gateway unavailable: {error}
          </div>
        )}

        {renderSection()}
      </main>
    </div>
  );
}
