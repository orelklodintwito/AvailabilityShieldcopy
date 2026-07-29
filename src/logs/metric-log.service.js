const { insertDocument, findRecentDocuments, safeJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

function getMetricValue(snapshot, key, fallback = null) {
  if (snapshot?.[key] !== undefined) return snapshot[key];
  if (snapshot?.metrics?.[key] !== undefined) return snapshot.metrics[key];
  return fallback;
}

async function writeMetricSnapshot(snapshot = {}) {
  await insertDocument("metric_snapshots", {
    timestamp: nowIso(),
    totalRequests: getMetricValue(snapshot, "totalRequests", 0),
    activeRequests: getMetricValue(snapshot, "activeRequests", 0),
    totalErrors: getMetricValue(snapshot, "totalErrors", 0),
    errorRate: getMetricValue(snapshot, "errorRate", 0),
    snapshot: safeJson(snapshot)
  });
}

function mapMetricSnapshotDocument(document) {
  return {
    id: String(document._id),
    timestamp: document.timestamp,
    totalRequests: document.totalRequests,
    activeRequests: document.activeRequests,
    totalErrors: document.totalErrors,
    errorRate: document.errorRate,
    snapshot: document.snapshot || {}
  };
}

async function getRecentMetricSnapshots(limit = 50) {
  const documents = await findRecentDocuments("metric_snapshots", limit);
  return documents.map(mapMetricSnapshotDocument);
}

module.exports = {
  writeMetricSnapshot,
  getRecentMetricSnapshots
};
