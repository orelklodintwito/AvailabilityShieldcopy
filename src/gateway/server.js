require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { loadPolicy } = require("./policies/policy-loader");
const { requestContextMiddleware } = require("./middleware/request-context.middleware");
const { metricsMiddleware } = require("./middleware/metrics.middleware");
const { mitigationMiddleware } = require("./middleware/mitigation.middleware");
const { createReverseProxy } = require("./proxy/reverse-proxy");
const { getMetricsSnapshot, resetMetrics } = require("../analyzer/traffic-metrics");
const { getWindowSnapshot, resetWindows } = require("../analyzer/request-window-store");
const { getRecentRequestLogs } = require("../logs/request-log.service");
const { getRecentSecurityEvents } = require("../logs/security-event.service");
const { writeMetricSnapshot, getRecentMetricSnapshots } = require("../logs/metric-log.service");
const { getQueueSnapshot, resetQueue } = require("./queue/request-queue");

const app = express();

const PORT = process.env.GATEWAY_PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/__shield/health", (req, res) => {
  const policy = loadPolicy();

  res.json({
    service: "availabilityshield-gateway",
    status: "ok",
    protectedTarget: policy.protectedTarget,
    timestamp: new Date().toISOString()
  });
});

app.post("/__shield/reset", (req, res) => {
  resetMetrics();
  resetWindows();
  resetQueue();

  res.json({
    status: "reset",
    message: "AvailabilityShield in-memory metrics, windows and queue were reset",
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/policy", (req, res) => {
  res.json(loadPolicy());
});

app.get("/__shield/queue", (req, res) => {
  res.json({
    queue: getQueueSnapshot(),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/metrics", (req, res) => {
  const snapshot = {
    metrics: getMetricsSnapshot(),
    windows: getWindowSnapshot(),
    queue: getQueueSnapshot()
  };

  writeMetricSnapshot(snapshot);

  res.json(snapshot);
});

app.get("/__shield/requests", (req, res) => {
  const limit = Number(req.query.limit || 50);

  res.json({
    logs: getRecentRequestLogs(limit),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/events", (req, res) => {
  const limit = Number(req.query.limit || 50);

  res.json({
    events: getRecentSecurityEvents(limit),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/metric-snapshots", (req, res) => {
  const limit = Number(req.query.limit || 20);

  res.json({
    snapshots: getRecentMetricSnapshots(limit),
    timestamp: new Date().toISOString()
  });
});

app.use(requestContextMiddleware);
app.use(metricsMiddleware);
app.use(mitigationMiddleware);
app.use(createReverseProxy());

app.listen(PORT, () => {
  const policy = loadPolicy();

  console.log(`AvailabilityShield Gateway running on http://localhost:${PORT}`);
  console.log(`Protected target: ${policy.protectedTarget}`);
});
