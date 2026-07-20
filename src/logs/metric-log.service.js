const { getDb, safeJson, parseJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

function getMetricValue(snapshot, key, fallback = null) {
  if (!snapshot) {
    return fallback;
  }

  if (snapshot[key] !== undefined) {
    return snapshot[key];
  }

  if (snapshot.metrics && snapshot.metrics[key] !== undefined) {
    return snapshot.metrics[key];
  }

  return fallback;
}

function writeMetricSnapshot(snapshot = {}) {
  const db = getDb();

  const row = {
    timestamp: nowIso(),
    total_requests: getMetricValue(snapshot, "totalRequests", 0),
    active_requests: getMetricValue(snapshot, "activeRequests", 0),
    total_errors: getMetricValue(snapshot, "totalErrors", 0),
    error_rate: getMetricValue(snapshot, "errorRate", 0),
    snapshot_json: safeJson(snapshot)
  };

  db.prepare(`
    INSERT INTO metric_snapshots (
      timestamp,
      total_requests,
      active_requests,
      total_errors,
      error_rate,
      snapshot_json
    )
    VALUES (
      @timestamp,
      @total_requests,
      @active_requests,
      @total_errors,
      @error_rate,
      @snapshot_json
    )
  `).run(row);
}

function mapMetricSnapshotRow(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    totalRequests: row.total_requests,
    activeRequests: row.active_requests,
    totalErrors: row.total_errors,
    errorRate: row.error_rate,
    snapshot: parseJson(row.snapshot_json, {})
  };
}

function getRecentMetricSnapshots(limit = 50) {
  const db = getDb();

  return db.prepare(`
    SELECT *
    FROM metric_snapshots
    ORDER BY id DESC
    LIMIT ?
  `).all(limit).map(mapMetricSnapshotRow);
}

module.exports = {
  writeMetricSnapshot,
  getRecentMetricSnapshots
};
