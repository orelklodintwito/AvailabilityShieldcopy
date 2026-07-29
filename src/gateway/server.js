require("dotenv").config({
  path: process.env.DOTENV_CONFIG_PATH || ".env"
});

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const crypto = require("crypto");

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
const { getMetrics: getLayer4Metrics, getEvents: getLayer4Events, getConnections: getLayer4Connections, getBlocked: getLayer4Blocked } = require("../layer4/layer4-service");
const simulations = require("./simulations/simulation-manager");
const {
  initializeTarget,
  getTargetConfig,
  setTarget,
  checkTarget,
  isInternalTarget
} = require("./targets/target-manager");
const { getDbMode } = require("../db/database");

const app = express();

app.set("trust proxy", process.env.TRUST_PROXY === "true");

// Keep backwards-compatible top-level fields while exposing one stable API envelope.
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && Object.prototype.hasOwnProperty.call(body, "success")) return json(body);
    const timestamp = body?.timestamp || new Date().toISOString();
    if (res.statusCode >= 400) {
      return json({ success: false, error: { code: body?.error || "REQUEST_FAILED", message: body?.message || body?.error || "Request failed" }, timestamp, ...body });
    }
    return json({ success: true, data: body, timestamp, ...body });
  };
  next();
});

const PORT = Number(process.env.PORT) || Number(process.env.GATEWAY_PORT) || 4000;
const HEALTH_TIMEOUT_MS = Number(
  process.env.PROTECTED_APP_HEALTH_TIMEOUT_MS || 1500
);
const PROTECTED_APP_AUTH_TOKEN = process.env.PROTECTED_APP_AUTH_TOKEN || "";

function protectedAppRequestConfig(config = {}, target = "") {
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...(PROTECTED_APP_AUTH_TOKEN && isInternalTarget(target)
        ? { "x-availabilityshield-internal-token": PROTECTED_APP_AUTH_TOKEN }
        : {})
    }
  };
}

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
app.use(morgan("dev"));

function clampLimit(value, fallback, maximum) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

function readLimit(value, fallback, maximum) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
}

async function getProtectedAppStatus() {
  const policy = loadPolicy();
  const target = policy.protectedTarget.replace(/\/$/, "");
  const checkedAt = new Date().toISOString();

  if (!isInternalTarget()) {
    try {
      const response = await axios.get(target, {
        timeout: HEALTH_TIMEOUT_MS,
        maxRedirects: 3,
        validateStatus: () => true
      });
      return {
        status: response.status >= 500 ? "degraded" : "healthy",
        reachable: true,
        externalTarget: true,
        service: new URL(target).hostname,
        target,
        httpStatus: response.status,
        checkedAt
      };
    } catch (error) {
      return {
        status: "unavailable",
        reachable: false,
        externalTarget: true,
        target,
        error: error.code === "ECONNABORTED" ? "Target health check timed out" : "Target could not be reached",
        checkedAt
      };
    }
  }

  try {
    const [healthResponse, loadResponse] = await Promise.all([
      axios.get(`${target}/health`, {
        timeout: HEALTH_TIMEOUT_MS
      }),
      axios.get(`${target}/__app/load`, {
        timeout: HEALTH_TIMEOUT_MS,
        ...protectedAppRequestConfig({}, target)
      })
    ]);

    const load = loadResponse.data || {};
    const config = load.config || {};
    const degradeThreshold = Number(
      config.basicDegradeActiveHeavy || 4
    );
    const activeHeavyRequests = Number(
      load.activeHeavyRequests || 0
    );

    const status =
      activeHeavyRequests >= degradeThreshold
        ? "degraded"
        : "healthy";

    return {
      status,
      reachable: true,
      service: healthResponse.data?.service || "protected-web-app",
      target,
      activeRequests: Number(load.activeRequests || 0),
      activeHeavyRequests,
      rejectedDueToOverload: Number(
        load.rejectedDueToOverload || 0
      ),
      basicRequestsDegraded: Number(
        load.basicRequestsDegraded || 0
      ),
      checkedAt
    };
  } catch (error) {
    return {
      status: "unavailable",
      reachable: false,
      target,
      error:
        error.code === "ECONNABORTED"
          ? "Protected app health check timed out"
          : "Protected app could not be reached",
      checkedAt
    };
  }
}

function getCurrentSeverity(metrics) {
  const latest = metrics.recentRequests?.[0];
  return latest?.severity || "normal";
}

app.get("/__shield/health", async (req, res) => {
  const policy = loadPolicy();
  const protectedApp = await getProtectedAppStatus();

  res.json({
    service: "availabilityshield-gateway",
    status: "ok",
    gateway: {
      status: "healthy",
      port: Number(PORT)
    },
    protectedApp,
    overallStatus:
      protectedApp.status === "unavailable"
        ? "degraded"
        : protectedApp.status,
    protectedTarget: policy.protectedTarget,
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/overview", async (req, res) => {
  const metrics = getMetricsSnapshot();
  const queue = getQueueSnapshot();
  const protectedApp = await getProtectedAppStatus();

  res.json({
    gateway: {
      status: "healthy",
      port: Number(PORT)
    },
    protectedApp,
    currentSeverity: getCurrentSeverity(metrics),
    traffic: {
      requestsPerSecond: metrics.requestsPerSecond,
      requestsPerMinute: metrics.requestsPerMinute,
      activeRequests: metrics.activeRequests,
      activeHeavyRequests: metrics.activeHeavyRequests,
      averageResponseTime: metrics.averageResponseTime,
      errorRate: metrics.errorRate
    },
    mitigation: {
      decisions: metrics.decisions,
      severityDistribution: metrics.severityDistribution,
      dropped: metrics.decisions.drop || 0,
      limited: metrics.decisions.limit || 0,
      queued: metrics.decisions.queue || 0
    },
    queue,
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/protected-app/load", async (req, res) => {
  const policy = loadPolicy();
  const target = policy.protectedTarget.replace(/\/$/, "");

  if (!isInternalTarget()) {
    return res.json({
      load: {
        available: false,
        externalTarget: true,
        message: "External sites do not expose AvailabilityShield internal load metrics"
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    const response = await axios.get(`${target}/__app/load`, {
      timeout: HEALTH_TIMEOUT_MS,
      ...protectedAppRequestConfig({}, target)
    });

    res.json({
      load: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      error: "PROTECTED_APP_UNAVAILABLE",
      message: "Protected app load information is unavailable",
      timestamp: new Date().toISOString()
    });
  }
});

function developmentOnly(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  return next();
}

function simulationAccess(req, res, next) {
  if (process.env.NODE_ENV !== "production") return next();

  if (process.env.ENABLE_CLOUD_DEMO_SIMULATOR !== "true") {
    return res.status(404).json({
      error: "SIMULATOR_DISABLED",
      message: "The cloud demo simulator is disabled for this deployment"
    });
  }

  if (!isInternalTarget()) {
    return res.status(409).json({
      error: "SIMULATOR_INTERNAL_TARGET_ONLY",
      message: "The cloud demo simulator can run only against the included Protected App"
    });
  }

  if (!hasAdminAccess(req)) {
    return res.status(401).json({
      error: "ADMIN_TOKEN_REQUIRED",
      message: "A valid dashboard admin token is required to run the cloud demo simulator"
    });
  }

  // Never allow a cloud request to turn this demo control into a public load tool.
  req.body = {
    ...(req.body || {}),
    mode: "with-shield",
    requests: Math.min(Number(req.body?.requests) || 12, 24),
    concurrency: Math.min(Number(req.body?.concurrency) || 2, 4)
  };

  return next();
}

app.post("/__shield/reset", developmentOnly, (req, res) => {
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

function hasAdminAccess(req) {
  const expected = process.env.SHIELD_ADMIN_TOKEN || "";
  if (!expected) return process.env.NODE_ENV !== "production";
  const supplied = req.get("x-availabilityshield-admin-token") || req.body?.adminToken || "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function requireAdmin(req, res, next) {
  if (hasAdminAccess(req)) return next();
  return res.status(401).json({ error: "ADMIN_TOKEN_REQUIRED", message: "A valid dashboard admin token is required" });
}

app.get("/__shield/target", (req, res) => {
  res.json({ ...getTargetConfig(), database: getDbMode(), timestamp: new Date().toISOString() });
});

app.get("/__shield/target/check", async (req, res) => {
  res.json(await checkTarget());
});

app.put("/__shield/target", requireAdmin, async (req, res) => {
  try {
    const config = await setTarget(req.body?.url || req.body?.target);
    res.json({ ...config, message: "Target site updated", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(400).json({ error: error.code || "TARGET_UPDATE_FAILED", message: error.message, timestamp: new Date().toISOString() });
  }
});

app.get("/__shield/queue", (req, res) => {
  res.json({
    queue: getQueueSnapshot(),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/metrics", async (req, res) => {
  const snapshot = {
    metrics: getMetricsSnapshot(),
    windows: getWindowSnapshot(),
    queue: getQueueSnapshot(),
    timestamp: new Date().toISOString()
  };

  await writeMetricSnapshot(snapshot).catch((error) => {
    console.error(`[AvailabilityShield] metric snapshot persistence failed: ${error.message}`);
  });
  res.json(snapshot);
});

app.get("/__shield/requests", async (req, res) => {
  const limit = readLimit(req.query.limit, 50, 200);
  if (limit === null) return res.status(400).json({ error: "INVALID_QUERY_LIMIT", message: "limit must be an integer between 1 and 200" });

  res.json({
    logs: await getRecentRequestLogs(limit),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/events", async (req, res) => {
  const limit = readLimit(req.query.limit, 50, 200);
  if (limit === null) return res.status(400).json({ error: "INVALID_QUERY_LIMIT", message: "limit must be an integer between 1 and 200" });

  res.json({
    events: await getRecentSecurityEvents(limit),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/metric-snapshots", async (req, res) => {
  const limit = readLimit(req.query.limit, 20, 200);
  if (limit === null) return res.status(400).json({ error: "INVALID_QUERY_LIMIT", message: "limit must be an integer between 1 and 200" });

  res.json({
    snapshots: await getRecentMetricSnapshots(limit),
    timestamp: new Date().toISOString()
  });
});

app.get("/__shield/layer4/health", (req, res) => {
  const metrics = getLayer4Metrics();
  res.json({ status: metrics.running ? "healthy" : "unavailable", ...metrics, timestamp: new Date().toISOString() });
});

app.get("/__shield/layer4/metrics", (req, res) => {
  res.json({ metrics: getLayer4Metrics(), timestamp: new Date().toISOString() });
});

app.get("/__shield/layer4/connections", (req, res) => {
  res.json({ connections: getLayer4Connections(), timestamp: new Date().toISOString() });
});

app.get("/__shield/layer4/blocked", (req, res) => {
  res.json({ blocked: getLayer4Blocked(), timestamp: new Date().toISOString() });
});

app.get("/__shield/layer4/events", (req, res) => {
  res.json({ events: getLayer4Events(clampLimit(req.query.limit, 50, 200)), timestamp: new Date().toISOString() });
});

app.post("/__shield/simulations", simulationAccess, (req, res) => {
  try {
    res.status(202).json({ simulation: simulations.start(req.body), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(error.code === "SIMULATION_ALREADY_RUNNING" ? 409 : 400).json({ error: error.code || "INVALID_SIMULATION", message: error.message, timestamp: new Date().toISOString() });
  }
});

app.get("/__shield/simulations/status", simulationAccess, (req, res) => {
  res.json({ simulation: simulations.getStatus(), timestamp: new Date().toISOString() });
});

app.get("/__shield/simulations/results", simulationAccess, (req, res) => {
  res.json({ result: simulations.getResults(), timestamp: new Date().toISOString() });
});

app.post("/__shield/simulations/cancel", simulationAccess, (req, res) => {
  res.json({ simulation: simulations.cancel(), timestamp: new Date().toISOString() });
});

app.use(requestContextMiddleware);
app.use(metricsMiddleware);
app.use(mitigationMiddleware);
app.use(createReverseProxy());

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.statusCode || error.status || 500);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: { code: error.code || "GATEWAY_ERROR", message: status === 500 ? "Gateway request failed" : error.message },
    timestamp: new Date().toISOString()
  });
});

async function start() {
  await initializeTarget();
  return app.listen(PORT, "0.0.0.0", () => {
    const policy = loadPolicy();
    console.log(`AvailabilityShield Gateway running on port ${PORT}`);
    console.log(`Protected target: ${policy.protectedTarget}`);
    console.log(`Database mode: ${getDbMode()}${getDbMode() === "memory" ? " (set MONGODB_URI for persistence)" : ""}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`[AvailabilityShield] Gateway startup failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { app, start };
