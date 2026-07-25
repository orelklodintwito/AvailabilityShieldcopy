const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const METRICS_PATH = path.join(PROJECT_ROOT, "logs", "layer4", "layer4-metrics.json");
const EVENTS_PATH = path.join(PROJECT_ROOT, "logs", "layer4", "layer4-events.jsonl");
const POLICY_PATH = path.join(PROJECT_ROOT, "layer4", "l4-policy.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function getPolicy() {
  return readJson(POLICY_PATH, {});
}

function getMetrics() {
  const payload = readJson(METRICS_PATH, null);

  if (!payload) {
    return {
      available: false,
      running: false,
      stats: {},
      policy: getPolicy(),
      timestamp: null
    };
  }

  const modifiedAt = fs.statSync(METRICS_PATH).mtime;
  const stale = Date.now() - modifiedAt.getTime() > 15_000;

  return {
    available: true,
    running: !stale,
    stale,
    stats: payload.stats || {},
    policy: payload.policy || getPolicy(),
    timestamp: payload.timestamp || modifiedAt.toISOString()
  };
}

function getEvents(limit = 50) {
  try {
    return fs
      .readFileSync(EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getConnections() {
  const stats = getMetrics().stats;

  return {
    active: Number(stats.activeConnections || 0),
    bySource: stats.bySource || {},
    byPort: stats.byPort || {},
    totalTcpSynSeen: Number(stats.totalTcpSynSeen || 0)
  };
}

function getBlocked() {
  const stats = getMetrics().stats;

  return Object.entries(stats.bySource || {})
    .filter(([, value]) => Number(value.dropped || 0) > 0)
    .map(([ip, value]) => ({ ip, ...value }));
}

module.exports = {
  getMetrics,
  getEvents,
  getConnections,
  getBlocked
};
