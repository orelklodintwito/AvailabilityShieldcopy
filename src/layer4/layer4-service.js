const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const LOG_DIR = process.env.AVAILABILITYSHIELD_LOG_DIR
  ? path.resolve(process.env.AVAILABILITYSHIELD_LOG_DIR)
  : path.join(PROJECT_ROOT, "logs", "layer4");
const METRICS_PATH = path.join(LOG_DIR, "layer4-metrics.json");
const EVENTS_PATH = path.join(LOG_DIR, "layer4-events.jsonl");
const POLICY_PATH = path.join(PROJECT_ROOT, "layer4", "l4-policy.json");
const {
  getLatestAgentSnapshot,
  getRecentAgentEvents
} = require("./layer4-cloud.service");

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

function getLocalMetrics() {
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

function getLocalEvents(limit = 50) {
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

async function getMetrics() {
  const cloud = await getLatestAgentSnapshot();
  if (cloud) return cloud;
  return getLocalMetrics();
}

async function getEvents(limit = 50) {
  const cloudEvents = await getRecentAgentEvents(limit);
  if (cloudEvents.length) return cloudEvents;
  return getLocalEvents(limit);
}

async function getConnections() {
  const stats = (await getMetrics()).stats;

  return {
    active: Number(stats.activeConnections || 0),
    bySource: stats.bySource || {},
    byPort: stats.byPort || {},
    totalTcpSynSeen: Number(stats.totalTcpSynSeen || 0)
  };
}

async function getBlocked() {
  const stats = (await getMetrics()).stats;

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
