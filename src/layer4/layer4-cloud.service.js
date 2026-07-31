const {
  findOneDocument,
  findRecentDocuments,
  insertDocument,
  upsertDocument,
  safeJson
} = require("../db/database");

const DEFAULT_STALE_MS = 15_000;
const MAX_AGENT_EVENTS = 100;
const MAX_COLLECTION_ITEMS = 200;

function staleAfterMs() {
  const value = Number(process.env.LAYER4_AGENT_STALE_MS || DEFAULT_STALE_MS);
  return Number.isFinite(value) && value >= 1_000 ? value : DEFAULT_STALE_MS;
}

function finiteCounter(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function sanitizeCounterMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).slice(0, MAX_COLLECTION_ITEMS).map(([key, item]) => {
      const source = item && typeof item === "object" ? item : {};
      return [String(key).slice(0, 128), {
        totalSyn: finiteCounter(source.totalSyn),
        allowed: finiteCounter(source.allowed),
        dropped: finiteCounter(source.dropped),
        warnings: finiteCounter(source.warnings),
        high: finiteCounter(source.high)
      }];
    })
  );
}

function sanitizeStats(stats) {
  const source = stats && typeof stats === "object" && !Array.isArray(stats) ? stats : {};

  return {
    startedAt: typeof source.startedAt === "string" ? source.startedAt.slice(0, 64) : null,
    mode: source.mode === "enforce" ? "enforce" : "monitor",
    filter: typeof source.filter === "string" ? source.filter.slice(0, 512) : "",
    totalPacketsSeen: finiteCounter(source.totalPacketsSeen),
    totalTcpSynSeen: finiteCounter(source.totalTcpSynSeen),
    totalAllowed: finiteCounter(source.totalAllowed),
    totalDropped: finiteCounter(source.totalDropped),
    totalWarnings: finiteCounter(source.totalWarnings),
    totalHigh: finiteCounter(source.totalHigh),
    bySource: sanitizeCounterMap(source.bySource),
    byPort: sanitizeCounterMap(source.byPort),
    lastEvent: source.lastEvent ? safeJson(source.lastEvent) : null
  };
}

function normalizeAgentId(value) {
  const agentId = String(value || "").trim();
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(agentId)) {
    const error = new Error("agentId must contain 1-64 letters, numbers, dots, underscores or dashes");
    error.code = "INVALID_LAYER4_AGENT_ID";
    throw error;
  }
  return agentId;
}

function normalizeTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const error = new Error("timestamp must be a valid date");
    error.code = "INVALID_LAYER4_TIMESTAMP";
    throw error;
  }
  return date.toISOString();
}

function normalizeAgentPayload(payload = {}) {
  return {
    agentId: normalizeAgentId(payload.agentId),
    running: payload.running === true,
    mode: payload.mode === "enforce" ? "enforce" : "monitor",
    stats: sanitizeStats(payload.stats),
    timestamp: normalizeTimestamp(payload.timestamp),
    lastSeenAt: new Date()
  };
}

async function saveAgentHeartbeat(payload) {
  return upsertDocument("layer4_agents", { agentId: normalizeAgentId(payload.agentId) }, normalizeAgentPayload(payload));
}

async function saveAgentMetrics(payload) {
  return saveAgentHeartbeat(payload);
}

function normalizeEvent(agentId, event) {
  const normalized = safeJson(event && typeof event === "object" ? event : { value: event });
  return {
    agentId,
    event: normalized,
    timestamp: normalizeTimestamp(normalized.timestamp),
    receivedAt: new Date()
  };
}

async function saveAgentEvents(payload = {}) {
  const agentId = normalizeAgentId(payload.agentId);
  const suppliedEvents = Array.isArray(payload.events)
    ? payload.events
    : payload.event
      ? [payload.event]
      : [];
  const events = suppliedEvents.slice(0, MAX_AGENT_EVENTS).map((event) => normalizeEvent(agentId, event));
  const ids = [];

  for (const event of events) {
    ids.push(await insertDocument("layer4_agent_events", event));
  }

  return { agentId, accepted: ids.length, ids };
}

function getStaleState(lastSeenAt) {
  const lastSeen = new Date(lastSeenAt || 0);
  const ageMs = Date.now() - lastSeen.getTime();
  return {
    stale: !Number.isFinite(ageMs) || ageMs > staleAfterMs(),
    ageMs: Number.isFinite(ageMs) && ageMs >= 0 ? ageMs : null
  };
}

async function getLatestAgentSnapshot(agentId) {
  const filter = agentId ? { agentId: normalizeAgentId(agentId) } : {};
  const record = await findOneDocument("layer4_agents", filter);
  if (!record) return null;

  const { stale, ageMs } = getStaleState(record.lastSeenAt);
  return {
    available: true,
    running: record.running === true && !stale,
    stale,
    source: "cloud-agent",
    agentId: record.agentId,
    mode: record.mode,
    stats: record.stats || {},
    policy: record.policy || {},
    timestamp: record.timestamp || null,
    lastSeenAt: record.lastSeenAt || null,
    ageMs,
    staleAfterMs: staleAfterMs()
  };
}

async function getRecentAgentEvents(limit = 50) {
  const records = await findRecentDocuments("layer4_agent_events", Math.min(Number(limit) || 50, MAX_AGENT_EVENTS));
  return records.map((record) => ({
    id: String(record._id),
    agentId: record.agentId,
    ...(record.event && typeof record.event === "object" ? record.event : { event: record.event }),
    receivedAt: record.receivedAt || record.createdAt
  }));
}

module.exports = {
  normalizeAgentPayload,
  saveAgentHeartbeat,
  saveAgentMetrics,
  saveAgentEvents,
  getLatestAgentSnapshot,
  getRecentAgentEvents,
  staleAfterMs
};
