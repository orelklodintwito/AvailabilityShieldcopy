const {
  recordRequestStart,
  recordRequestEnd
} = require("../../analyzer/traffic-metrics");

const { writeRequestLog } = require("../../logs/request-log.service");

function metricsMiddleware(req, res, next) {
  if (!req.shieldContext) {
    return next();
  }

  recordRequestStart(req.shieldContext);

  res.on("finish", () => {
    const durationMs = Date.now() - req.shieldContext.startedAt;

    recordRequestEnd(req.shieldContext, {
      statusCode: res.statusCode
    });

    writeRequestLog(req.shieldContext, {
      statusCode: res.statusCode,
      durationMs
    });
  });

  next();
}

module.exports = {
  metricsMiddleware
};
