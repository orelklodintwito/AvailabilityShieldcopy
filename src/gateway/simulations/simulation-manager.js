const axios = require("axios");
const crypto = require("crypto");

const SCENARIOS = {
  normal: { paths: ["/health", "/api/basic"], requests: 12, concurrency: 2 },
  "http-flood": { paths: ["/api/basic", "/api/search"], requests: 60, concurrency: 5 },
  heavy: { paths: ["/api/search", "/api/report", "/api/export"], requests: 30, concurrency: 4 },
  "basic-preservation": { paths: ["/api/export", "/api/basic"], requests: 36, concurrency: 6 }
};

let current = null;
let lastResult = null;

function snapshot() {
  return current || {
    status: "idle",
    progress: 0,
    completed: 0,
    total: 0
  };
}

function clamp(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), min), max)
    : fallback;
}

async function runWorker(job, workerId) {
  while (!job.cancelled) {
    const index = job.nextIndex++;

    if (index >= job.total) {
      return;
    }

    const path = job.paths[index % job.paths.length];
    const startedAt = Date.now();

    try {
      const response = await axios.get(`${job.target}${path}`, {
        timeout: 15_000,
        validateStatus: () => true
      });

      job.items[index] = {
        index,
        workerId,
        path,
        status: response.status,
        durationMs: Date.now() - startedAt,
        decision: response.headers["x-availabilityshield-decision"] || "none",
        severity: response.headers["x-availabilityshield-severity"] || "none"
      };
    } catch (error) {
      job.items[index] = {
        index,
        workerId,
        path,
        status: 0,
        durationMs: Date.now() - startedAt,
        error: error.code || error.message
      };
    }

    job.completed += 1;
    job.progress = Math.round((job.completed / job.total) * 100);
  }
}

function summarize(job) {
  const items = job.items.filter(Boolean);
  const decisions = {};

  for (const item of items) {
    decisions[item.decision || "none"] = (decisions[item.decision || "none"] || 0) + 1;
  }

  return {
    id: job.id,
    scenario: job.scenario,
    mode: job.mode,
    status: job.cancelled ? "cancelled" : "completed",
    startedAt: job.startedAt,
    completedAt: new Date().toISOString(),
    total: job.total,
    successful: items.filter((item) => item.status >= 200 && item.status < 400).length,
    errors: items.filter((item) => item.status === 0 || item.status >= 500).length,
    averageResponseTime: Math.round(
      items.reduce((sum, item) => sum + item.durationMs, 0) / Math.max(items.length, 1)
    ),
    decisions,
    items
  };
}

async function execute(job) {
  try {
    await Promise.all(
      Array.from({ length: job.concurrency }, (_, index) => runWorker(job, index + 1))
    );
    lastResult = summarize(job);
    current = { ...lastResult, progress: 100, completed: job.completed };
  } catch (error) {
    current = {
      ...job,
      status: "failed",
      error: error.message
    };
  }
}

function start(input = {}) {
  if (current?.status === "running") {
    const error = new Error("A simulation is already running");
    error.code = "SIMULATION_ALREADY_RUNNING";
    throw error;
  }

  const scenario = input.scenario || "normal";
  const preset = SCENARIOS[scenario];

  if (!preset) {
    const error = new Error("Unknown simulation scenario");
    error.code = "INVALID_SIMULATION_SCENARIO";
    throw error;
  }

  const mode = input.mode === "without-shield" ? "without-shield" : "with-shield";
  current = {
    id: crypto.randomUUID(),
    scenario,
    mode,
    status: "running",
    startedAt: new Date().toISOString(),
    target: mode === "without-shield" ? "http://127.0.0.1:3000" : "http://127.0.0.1:4000",
    paths: preset.paths,
    total: clamp(input.requests, preset.requests, 1, 200),
    concurrency: clamp(input.concurrency, preset.concurrency, 1, 10),
    nextIndex: 0,
    completed: 0,
    progress: 0,
    cancelled: false,
    items: []
  };

  execute(current);
  return snapshot();
}

function cancel() {
  if (current?.status !== "running") {
    return snapshot();
  }

  current.cancelled = true;
  current.status = "cancelling";
  return snapshot();
}

module.exports = {
  start,
  cancel,
  getStatus: snapshot,
  getResults: () => lastResult,
  SCENARIOS
};
