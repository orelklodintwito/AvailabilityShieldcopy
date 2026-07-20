const { loadPolicy, getEndpointPolicy } = require("../policies/policy-loader");
const { getMetricsSnapshot } = require("../../analyzer/traffic-metrics");
const { recordRequestInWindow } = require("../../analyzer/request-window-store");
const { decideMitigation } = require("../engine/rule-engine");
const { applyDecision } = require("../engine/decision-actions");
const { writeSecurityEvent } = require("../../logs/security-event.service");

async function mitigationMiddleware(req, res, next) {
  const context = req.shieldContext;

  if (!context) {
    return next();
  }

  const policy = loadPolicy();
  const endpointPolicy = getEndpointPolicy(context.endpoint);
  const windowStats = recordRequestInWindow(context, policy);
  const metricsSnapshot = getMetricsSnapshot();

  const decision = decideMitigation({
    context,
    endpointPolicy,
    windowStats,
    metricsSnapshot,
    policy
  });

  context.endpointType = endpointPolicy?.type || "unknown";
  context.priority = endpointPolicy?.priority || "medium";
  context.decision = decision.decision;
  context.severity = decision.severity;
  context.reason = decision.reason;
  context.delayMs = decision.delayMs || 0;
  context.queueWaitMs = 0;
  context.windowStats = windowStats;

  req.shieldPolicy = policy;

  console.log(
    `[AvailabilityShield] DECISION ${context.decision.toUpperCase()} severity=${context.severity} endpoint=${context.endpoint} ip=${context.ip} reason="${context.reason}"`
  );

  if (context.decision !== "allow" || context.severity !== "normal") {
    writeSecurityEvent(context);
  }

  return applyDecision(req, res, next);
}

module.exports = {
  mitigationMiddleware
};
