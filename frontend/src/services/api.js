const BASE_URL = (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 8000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: options.signal || controller.signal
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        body.error?.message ||
        body.message ||
        `Request failed with status ${response.status}`;

      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The gateway request timed out");
    }

    if (error instanceof TypeError) {
      throw new Error("Could not connect to the AvailabilityShield gateway");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const shieldApi = {
  health: () => request("/__shield/health"),

  overview: () => request("/__shield/overview"),

  metrics: () => request("/__shield/metrics"),

  events: (limit = 20) =>
    request(`/__shield/events?limit=${limit}`),

  requests: (limit = 30) =>
    request(`/__shield/requests?limit=${limit}`),

  policy: () => request("/__shield/policy"),

  queue: () => request("/__shield/queue"),

  snapshots: (limit = 16) =>
    request(`/__shield/metric-snapshots?limit=${limit}`),

  protectedAppLoad: () =>
    request("/__shield/protected-app/load"),

  layer4Health: () => request("/__shield/layer4/health"),
  layer4Metrics: () => request("/__shield/layer4/metrics"),
  layer4Connections: () => request("/__shield/layer4/connections"),
  layer4Blocked: () => request("/__shield/layer4/blocked"),
  layer4Events: (limit = 50) => request(`/__shield/layer4/events?limit=${limit}`),

  startSimulation: (payload) => request("/__shield/simulations", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  simulationStatus: () => request("/__shield/simulations/status"),
  simulationResults: () => request("/__shield/simulations/results"),
  cancelSimulation: () => request("/__shield/simulations/cancel", { method: "POST" }),

  reset: () =>
    request("/__shield/reset", {
      method: "POST"
    })
};
