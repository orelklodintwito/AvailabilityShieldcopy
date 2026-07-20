const heavyEndpoints = new Set([
  "/api/search",
  "/api/report",
  "/api/export"
]);

function createInitialState() {
  return {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    activeRequests: 0,
    activeHeavyRequests: 0,
    rejectedDueToOverload: 0,
    basicRequestsDegraded: 0,
    byEndpoint: {}
  };
}

let state = createInitialState();

function getNumberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function isHeavyEndpoint(path) {
  return heavyEndpoints.has(path);
}

function getOrCreateEndpointStats(endpoint) {
  if (!state.byEndpoint[endpoint]) {
    state.byEndpoint[endpoint] = {
      totalRequests: 0,
      activeRequests: 0,
      rejectedDueToOverload: 0
    };
  }

  return state.byEndpoint[endpoint];
}

function getLoadSnapshot() {
  return {
    ...state,
    config: {
      maxActiveHeavy: getNumberEnv("PROTECTED_APP_MAX_ACTIVE_HEAVY", 4),
      basicDegradeActiveHeavy: getNumberEnv("PROTECTED_APP_BASIC_DEGRADE_ACTIVE_HEAVY", 4),
      basicOverloadDelayMs: getNumberEnv("PROTECTED_APP_BASIC_OVERLOAD_DELAY_MS", 600)
    }
  };
}

function resetLoadState() {
  state = createInitialState();
}

function loadStateMiddleware(req, res, next) {
  const endpoint = req.path;
  const heavy = isHeavyEndpoint(endpoint);

  const maxActiveHeavy = getNumberEnv("PROTECTED_APP_MAX_ACTIVE_HEAVY", 4);
  const basicDegradeActiveHeavy = getNumberEnv("PROTECTED_APP_BASIC_DEGRADE_ACTIVE_HEAVY", 4);
  const basicOverloadDelayMs = getNumberEnv("PROTECTED_APP_BASIC_OVERLOAD_DELAY_MS", 600);

  const endpointStats = getOrCreateEndpointStats(endpoint);

  if (heavy && state.activeHeavyRequests >= maxActiveHeavy) {
    state.totalRequests += 1;
    state.rejectedDueToOverload += 1;

    endpointStats.totalRequests += 1;
    endpointStats.rejectedDueToOverload += 1;

    return res.status(503).json({
      error: "Protected application overloaded",
      message: "The protected app rejected a heavy request because active heavy load is too high",
      endpoint,
      activeHeavyRequests: state.activeHeavyRequests,
      maxActiveHeavy,
      timestamp: new Date().toISOString()
    });
  }

  state.totalRequests += 1;
  state.activeRequests += 1;

  endpointStats.totalRequests += 1;
  endpointStats.activeRequests += 1;

  if (heavy) {
    state.activeHeavyRequests += 1;
  }

  req.appLoad = {
    isHeavy: heavy,
    extraDelayMs: 0
  };

  if (!heavy && state.activeHeavyRequests >= basicDegradeActiveHeavy) {
    state.basicRequestsDegraded += 1;
    req.appLoad.extraDelayMs = basicOverloadDelayMs;
  }

  res.on("finish", () => {
    state.activeRequests = Math.max(0, state.activeRequests - 1);
    endpointStats.activeRequests = Math.max(0, endpointStats.activeRequests - 1);

    if (heavy) {
      state.activeHeavyRequests = Math.max(0, state.activeHeavyRequests - 1);
    }
  });

  next();
}

module.exports = {
  loadStateMiddleware,
  getLoadSnapshot,
  resetLoadState,
  isHeavyEndpoint
};
