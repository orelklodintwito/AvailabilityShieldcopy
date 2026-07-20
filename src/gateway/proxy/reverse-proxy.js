const axios = require("axios");
const { loadPolicy } = require("../policies/policy-loader");

function removeHopByHopHeaders(headers) {
  const cleanHeaders = { ...headers };

  delete cleanHeaders.host;
  delete cleanHeaders.connection;
  delete cleanHeaders["content-length"];
  delete cleanHeaders["accept-encoding"];

  return cleanHeaders;
}

function shouldForwardBody(method) {
  return !["GET", "HEAD"].includes(method.toUpperCase());
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
          "x-forwarded-for": context.ip,
          "x-availabilityshield-request-id": context.requestId,
          "x-availabilityshield-decision": context.decision,
          "x-availabilityshield-severity": context.severity
        },
        data: shouldForwardBody(req.method) ? req.body : undefined,
        timeout: 15000,
        validateStatus: () => true
      });

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
