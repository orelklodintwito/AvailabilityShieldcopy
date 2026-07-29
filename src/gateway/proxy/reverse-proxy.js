const axios = require("axios");
const { loadPolicy } = require("../policies/policy-loader");
const { isInternalTarget } = require("../targets/target-manager");

function removeHopByHopHeaders(headers) {
  const cleanHeaders = { ...headers };

  delete cleanHeaders.host;
  delete cleanHeaders.connection;
  delete cleanHeaders["content-length"];
  delete cleanHeaders["accept-encoding"];
  delete cleanHeaders["transfer-encoding"];
  delete cleanHeaders["content-encoding"];

  return cleanHeaders;
}

function shouldForwardBody(method) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

function internalHeaders(target) {
  return process.env.PROTECTED_APP_AUTH_TOKEN && isInternalTarget(target)
    ? { "x-availabilityshield-internal-token": process.env.PROTECTED_APP_AUTH_TOKEN }
    : {};
}

function buildTargetUrl(targetBaseUrl, originalUrl) {
  return `${targetBaseUrl.replace(/\/$/, "")}${originalUrl}`;
}

function createReverseProxy() {
  return async function reverseProxy(req, res) {
    const policy = loadPolicy();
    const targetUrl = buildTargetUrl(policy.protectedTarget, req.originalUrl);
    const context = req.shieldContext;

    if (!context.decision) {
      context.decision = "allow";
      context.severity = "normal";
      context.reason = "Gateway pass-through: request allowed";
    }

    try {
      const proxyResponse = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...removeHopByHopHeaders(req.headers),
          ...internalHeaders(policy.protectedTarget),
          "x-forwarded-for": context.ip,
          "x-availabilityshield-request-id": context.requestId,
          "x-availabilityshield-decision": context.decision,
          "x-availabilityshield-severity": context.severity
        },
        data: shouldForwardBody(req.method) ? req.body : undefined,
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: () => true
      });

      for (const [name, value] of Object.entries(removeHopByHopHeaders(proxyResponse.headers || {}))) {
        if (value !== undefined) res.setHeader(name, value);
      }

      res.setHeader("x-availabilityshield-decision", context.decision);
      res.setHeader("x-availabilityshield-severity", context.severity);

      console.log(
        `[AvailabilityShield] FORWARDED ${context.decision.toUpperCase()} ${context.method} ${context.originalUrl} ip=${context.ip} status=${proxyResponse.status}`
      );

      return res.status(proxyResponse.status).send(proxyResponse.data);
    } catch (error) {
      context.decision = "alert";
      context.severity = "critical";
      context.reason = "Protected application did not respond";

      console.error(
        `[AvailabilityShield] ALERT ${context.method} ${context.originalUrl} ip=${context.ip} error=${error.message}`
      );

      return res.status(502).json({
        error: "Bad Gateway",
        message: "Protected application did not respond",
        requestId: context.requestId,
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = {
  createReverseProxy
};
