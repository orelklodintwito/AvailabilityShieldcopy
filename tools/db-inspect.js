const { getDb, getDbPath } = require("../src/db/database");

const db = getDb();

function count(table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

const summary = {
  dbPath: getDbPath(),
  requestLogs: count("request_logs"),
  securityEvents: count("security_events"),
  metricSnapshots: count("metric_snapshots"),
  recentRequests: db.prepare(`
    SELECT id, timestamp, method, endpoint, decision, severity, status_code, duration_ms, queue_wait_ms
    FROM request_logs
    ORDER BY id DESC
    LIMIT 10
  `).all(),
  recentSecurityEvents: db.prepare(`
    SELECT id, timestamp, endpoint, decision, severity, reason
    FROM security_events
    ORDER BY id DESC
    LIMIT 10
  `).all()
};

console.log(JSON.stringify(summary, null, 2));
