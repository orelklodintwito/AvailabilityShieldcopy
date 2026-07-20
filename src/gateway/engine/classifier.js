function classifyRequest({ endpointPolicy, windowStats, metricsSnapshot, policy }) {
  const thresholds = policy.thresholds || {};
  const rateLimit = endpointPolicy?.rateLimitPerMinute || 60;

  const warningAt = Math.floor(rateLimit * (thresholds.warningRatio || 0.7));
  const highAt = Math.floor(rateLimit * (thresholds.highRatio || 1.0));
  const criticalAt = Math.floor(rateLimit * (thresholds.criticalRatio || 1.5));

  const endpointCount = windowStats.endpointRequestCount;
  const activeRequests = metricsSnapshot.activeRequests || 0;
  const maxActiveBeforeQueue = thresholds.maxActiveRequestsBeforeQueue || 20;

  if (endpointCount >= criticalAt) {
    return {
      severity: "critical",
      reason: `Critical endpoint request rate: ${endpointCount}/${rateLimit} per minute`
    };
  }

  if (activeRequests >= maxActiveBeforeQueue && endpointPolicy?.type === "heavy") {
    return {
      severity: "high",
      reason: `High active request count: ${activeRequests}`
    };
  }

  if (endpointCount >= highAt) {
    return {
      severity: "high",
      reason: `High endpoint request rate: ${endpointCount}/${rateLimit} per minute`
    };
  }

  if (endpointCount >= warningAt) {
    return {
      severity: "warning",
      reason: `Warning endpoint request rate: ${endpointCount}/${rateLimit} per minute`
    };
  }

  return {
    severity: "normal",
    reason: `Normal endpoint request rate: ${endpointCount}/${rateLimit} per minute`
  };
}

module.exports = {
  classifyRequest
};
