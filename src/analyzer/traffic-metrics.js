function createInitialState() {
  return {
    startedAt: new Date().toISOString(),
    startedAtMs: Date.now(),
    totalRequests: 0,
    completedRequests: 0,
    activeRequests: 0,
    activeHeavyRequests: 0,
    totalErrors: 0,
    totalDurationMs: 0,
    decisions: {
      allow: 0,
      limit: 0,
      delay: 0,
      queue: 0,
      drop: 0,
      alert: 0
    },
    severityDistribution: {
      normal: 0,
      warning: 0,
      high: 0,
      critical: 0
    },
    byEndpoint: {},
    byIp: {},
    recentRequests: [],
    requestTimestamps: []
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

function pruneRequestTimestamps(now = Date.now()) {
  const oneMinuteAgo = now - 60_000;

  while (
    state.requestTimestamps.length > 0 &&
    state.requestTimestamps[0] < oneMinuteAgo
  ) {
    state.requestTimestamps.shift();
  }
}

function recordRequestStart(context) {
  const now = Date.now();

  state.totalRequests += 1;
  state.activeRequests += 1;
  state.requestTimestamps.push(now);
  pruneRequestTimestamps(now);

  const endpointStats = getOrCreate(state.byEndpoint, context.endpoint);
  endpointStats.requestCount += 1;
  endpointStats.lastSeenAt = new Date(now).toISOString();

  const ipStats = getOrCreate(state.byIp, context.ip);
  ipStats.requestCount += 1;
  ipStats.lastSeenAt = new Date(now).toISOString();
}

function recordRequestClassification(context) {
  if (
    context.endpointType === "heavy" &&
    !context.metricsHeavyCounted
  ) {
    context.metricsHeavyCounted = true;
    state.activeHeavyRequests += 1;
  }
}

function updateDuration(stats, durationMs) {
  stats.totalDurationMs += durationMs;
  stats.averageDurationMs = Math.round(
    stats.totalDurationMs / Math.max(stats.requestCount, 1)
  );
}

function recordRequestEnd(context, result) {
  const durationMs = Date.now() - context.startedAt;
  const statusCode = result.statusCode || 0;
  const isError = statusCode >= 500 || statusCode === 0;

  state.activeRequests = Math.max(0, state.activeRequests - 1);
  state.completedRequests += 1;
  state.totalDurationMs += durationMs;

  if (context.metricsHeavyCounted) {
    state.activeHeavyRequests = Math.max(
      0,
      state.activeHeavyRequests - 1
    );
  }

  if (isError) {
    state.totalErrors += 1;
  }

  const decision = context.decision || "allow";

  if (!Object.prototype.hasOwnProperty.call(state.decisions, decision)) {
    state.decisions[decision] = 0;
  }

  state.decisions[decision] += 1;

  const severity = context.severity || "normal";

  if (
    !Object.prototype.hasOwnProperty.call(
      state.severityDistribution,
      severity
    )
  ) {
    state.severityDistribution[severity] = 0;
  }

  state.severityDistribution[severity] += 1;

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
    endpointType: context.endpointType || "unknown",
    statusCode,
    durationMs,
    decision,
    severity,
    reason: context.reason,
    queueWaitMs: context.queueWaitMs || 0,
    timestamp: new Date().toISOString()
  });

  state.recentRequests = state.recentRequests.slice(0, 50);
}

function getMetricsSnapshot() {
  const now = Date.now();
  pruneRequestTimestamps(now);

  const oneSecondAgo = now - 1_000;
  const requestsPerSecond = state.requestTimestamps.filter(
    (timestamp) => timestamp >= oneSecondAgo
  ).length;

  const requestsPerMinute = state.requestTimestamps.length;

  const errorRate =
    state.completedRequests === 0
      ? 0
      : Number(
          (state.totalErrors / state.completedRequests).toFixed(4)
        );

  const averageResponseTime =
    state.completedRequests === 0
      ? 0
      : Math.round(
          state.totalDurationMs / state.completedRequests
        );

  return {
    startedAt: state.startedAt,
    uptimeSeconds: Math.floor((now - state.startedAtMs) / 1_000),
    totalRequests: state.totalRequests,
    completedRequests: state.completedRequests,
    activeRequests: state.activeRequests,
    activeHeavyRequests: state.activeHeavyRequests,
    totalErrors: state.totalErrors,
    errorRate,
    averageResponseTime,
    requestsPerSecond,
    requestsPerMinute,
    decisions: { ...state.decisions },
    severityDistribution: { ...state.severityDistribution },
    byEndpoint: state.byEndpoint,
    byIp: state.byIp,
    recentRequests: state.recentRequests
  };
}

function resetMetrics() {
  state = createInitialState();
}

module.exports = {
  recordRequestStart,
  recordRequestClassification,
  recordRequestEnd,
  getMetricsSnapshot,
  resetMetrics
};
