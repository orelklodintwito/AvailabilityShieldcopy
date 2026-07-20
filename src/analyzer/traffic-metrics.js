function createInitialState() {
  return {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    activeRequests: 0,
    totalErrors: 0,
    decisions: {
      allow: 0,
      limit: 0,
      delay: 0,
      queue: 0,
      drop: 0,
      alert: 0
    },
    byEndpoint: {},
    byIp: {},
    recentRequests: []
  };
}

let state = createInitialState();

function createEmptyStats() {
  return {
    requestCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    lastSeenAt: null
  };
}

function getOrCreate(map, key) {
  if (!map[key]) {
    map[key] = createEmptyStats();
  }

  return map[key];
}

function recordRequestStart(context) {
  state.totalRequests += 1;
  state.activeRequests += 1;

  const endpointStats = getOrCreate(state.byEndpoint, context.endpoint);
  endpointStats.requestCount += 1;
  endpointStats.lastSeenAt = new Date().toISOString();

  const ipStats = getOrCreate(state.byIp, context.ip);
  ipStats.requestCount += 1;
  ipStats.lastSeenAt = new Date().toISOString();
}

function updateDuration(stats, durationMs) {
  stats.totalDurationMs += durationMs;
  stats.averageDurationMs = Math.round(stats.totalDurationMs / stats.requestCount);
}

function recordRequestEnd(context, result) {
  const durationMs = Date.now() - context.startedAt;
  const statusCode = result.statusCode || 0;
  const isError = statusCode >= 500;

  state.activeRequests = Math.max(0, state.activeRequests - 1);

  if (isError) {
    state.totalErrors += 1;
  }

  const decision = context.decision || "allow";

  if (!state.decisions[decision]) {
    state.decisions[decision] = 0;
  }

  state.decisions[decision] += 1;

  const endpointStats = getOrCreate(state.byEndpoint, context.endpoint);
  updateDuration(endpointStats, durationMs);

  const ipStats = getOrCreate(state.byIp, context.ip);
  updateDuration(ipStats, durationMs);

  if (isError) {
    endpointStats.errorCount += 1;
    ipStats.errorCount += 1;
  }

  state.recentRequests.unshift({
    requestId: context.requestId,
    ip: context.ip,
    method: context.method,
    endpoint: context.endpoint,
    statusCode,
    durationMs,
    decision,
    severity: context.severity,
    reason: context.reason,
    timestamp: new Date().toISOString()
  });

  state.recentRequests = state.recentRequests.slice(0, 50);
}

function getMetricsSnapshot() {
  const errorRate = state.totalRequests === 0
    ? 0
    : Number((state.totalErrors / state.totalRequests).toFixed(4));

  return {
    ...state,
    errorRate
  };
}

function resetMetrics() {
  state = createInitialState();
}

module.exports = {
  recordRequestStart,
  recordRequestEnd,
  getMetricsSnapshot,
  resetMetrics
};
