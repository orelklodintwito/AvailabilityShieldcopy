const { classifyRequest } = require("./classifier");

function decideMitigation({ context, endpointPolicy, windowStats, metricsSnapshot, policy }) {
  const thresholds = policy.thresholds || {};
  const endpointType = endpointPolicy?.type || "unknown";
  const priority = endpointPolicy?.priority || "medium";
  const activeRequests = metricsSnapshot.activeRequests || 0;
  const maxActiveBeforeQueue = thresholds.maxActiveRequestsBeforeQueue || 4;

  if (!endpointPolicy) {
    return {
      decision: "allow",
      severity: "normal",
      delayMs: 0,
      reason: "Endpoint is not listed in Site Policy, allowing for monitoring"
    };
  }

  if (endpointType === "heavy" && activeRequests > maxActiveBeforeQueue) {
    return {
      decision: "queue",
      severity: "high",
      delayMs: thresholds.queueDelayMs || 1500,
      reason: `Gateway active request pressure: ${activeRequests}/${maxActiveBeforeQueue}. Heavy request queued before reaching protected app`
    };
  }

  const classification = classifyRequest({
    endpointPolicy,
    windowStats,
    metricsSnapshot,
    policy
  });

  if (classification.severity === "critical") {
    if (priority === "high") {
      return {
        decision: "queue",
        severity: "critical",
        delayMs: thresholds.queueDelayMs || 1500,
        reason: `${classification.reason}. High priority endpoint queued instead of dropped`
      };
    }

    return {
      decision: "drop",
      severity: "critical",
      delayMs: 0,
      reason: `${classification.reason}. Suspicious low/medium priority traffic dropped`
    };
  }

  if (classification.severity === "high") {
    if (endpointType === "heavy") {
      return {
        decision: "delay",
        severity: "high",
        delayMs: endpointPolicy.delayMsWhenHigh || thresholds.defaultDelayMs || 300,
        reason: `${classification.reason}. Heavy endpoint delayed`
      };
    }

    return {
      decision: "limit",
      severity: "high",
      delayMs: 0,
      reason: `${classification.reason}. Basic endpoint soft-limited`
    };
  }

  if (classification.severity === "warning") {
    if (endpointType === "heavy") {
      return {
        decision: "delay",
        severity: "warning",
        delayMs: Math.floor((endpointPolicy.delayMsWhenHigh || thresholds.defaultDelayMs || 300) / 2),
        reason: `${classification.reason}. Soft delay for heavy endpoint`
      };
    }

    return {
      decision: "allow",
      severity: "warning",
      delayMs: 0,
      reason: `${classification.reason}. Basic endpoint allowed with warning`
    };
  }

  return {
    decision: "allow",
    severity: "normal",
    delayMs: 0,
    reason: classification.reason
  };
}

module.exports = {
  decideMitigation
};
