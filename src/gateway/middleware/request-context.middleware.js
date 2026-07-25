const crypto = require("crypto");

function normalizeIp(ip) {
  if (!ip) {
    return "unknown";
  }

  if (ip === "::1") {
    return "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  return ip;
}

function getClientIp(req) {
  // The gateway is the trust boundary; do not accept client-supplied
  // X-Forwarded-For unless an explicitly trusted proxy is configured.
  if (process.env.TRUST_PROXY === "true" && req.socket.remoteAddress === "127.0.0.1") {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) return normalizeIp(forwardedFor.split(",")[0].trim());
  }
  return normalizeIp(req.socket.remoteAddress);
}

function requestContextMiddleware(req, res, next) {
  req.shieldContext = {
    requestId: crypto.randomUUID(),
    ip: getClientIp(req),
    method: req.method,
    endpoint: req.path,
    originalUrl: req.originalUrl,
    startedAt: Date.now(),
    decision: "allow",
    severity: "normal",
    reason: "Initial Layer 7 gateway pass-through"
  };

  res.setHeader("x-availabilityshield-request-id", req.shieldContext.requestId);

  next();
}

module.exports = {
  requestContextMiddleware
};
