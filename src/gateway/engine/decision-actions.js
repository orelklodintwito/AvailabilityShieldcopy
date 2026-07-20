const { sleep } = require("../../shared/sleep");
const { acquireHeavySlot } = require("../queue/request-queue");

function setShieldHeaders(res, context) {
  res.setHeader("x-availabilityshield-decision", context.decision);
  res.setHeader("x-availabilityshield-severity", context.severity);
  res.setHeader("x-availabilityshield-reason", encodeURIComponent(context.reason || ""));
  res.setHeader("x-availabilityshield-queue-wait-ms", String(context.queueWaitMs || 0));
}

async function applyHeavyConcurrencyGate(req, res) {
  const context = req.shieldContext;

  if (context.endpointType !== "heavy") {
    return true;
  }

  if (!["allow", "delay", "queue"].includes(context.decision)) {
    return true;
  }

  const slot = await acquireHeavySlot(context, req.shieldPolicy || {});

  if (slot.rejected) {
    context.decision = "drop";
    context.severity = "critical";
    context.reason = "Gateway queue is full. Heavy request dropped before reaching protected app";
    context.queueWaitMs = 0;

    return false;
  }

  if (slot.queued || context.decision === "queue") {
    context.decision = "queue";
    context.severity = context.severity === "critical" ? "critical" : "high";
    context.queueWaitMs = slot.waitMs || 0;
    context.reason = `Gateway queued heavy request for ${context.queueWaitMs}ms before forwarding. ${context.reason}`;
  }

  let released = false;

  function releaseOnce() {
    if (released) {
      return;
    }

    released = true;
    slot.release();
  }

  res.on("finish", releaseOnce);
  res.on("close", releaseOnce);

  return true;
}

async function applyDecision(req, res, next) {
  const context = req.shieldContext;

  if (context.decision === "limit") {
    setShieldHeaders(res, context);

    return res.status(429).json({
      error: "Rate limited",
      decision: context.decision,
      severity: context.severity,
      reason: context.reason,
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
  }

  if (context.decision === "drop") {
    setShieldHeaders(res, context);

    return res.status(503).json({
      error: "Request dropped by AvailabilityShield",
      decision: context.decision,
      severity: context.severity,
      reason: context.reason,
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
  }

  if (context.decision === "delay") {
    await sleep(context.delayMs || 0);
  }

  const canForward = await applyHeavyConcurrencyGate(req, res);

  if (!canForward) {
    setShieldHeaders(res, context);

    return res.status(503).json({
      error: "Request dropped by AvailabilityShield",
      decision: context.decision,
      severity: context.severity,
      reason: context.reason,
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    });
  }

  setShieldHeaders(res, context);

  return next();
}

module.exports = {
  applyDecision
};
