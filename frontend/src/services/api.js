const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_GATEWAY_URL ||
  ""
).replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 8000;

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retry = 1, signal, ...fetchOptions } = options;
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers: { "Content-Type": "application/json", ...fetchOptions.headers },
        signal: signal || controller.signal
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body.error?.message || body.message || `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      return response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The gateway request timed out");
      if (error instanceof TypeError && attempt < retry && !signal?.aborted) {
        attempt += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 150 * attempt));
        continue;
      }
      if (error instanceof TypeError) throw new Error("Could not connect to the AvailabilityShield gateway");
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      window.clearTimeout(timeout);
    }
  }
}

export const shieldApi = {
  health: (options) => request("/__shield/health", options),

  overview: (options) => request("/__shield/overview", options),

  metrics: (options) => request("/__shield/metrics", options),

  events: (limit = 20, options) => request(`/__shield/events?limit=${limit}`, options),

  requests: (limit = 30, options) => request(`/__shield/requests?limit=${limit}`, options),

  policy: (options) => request("/__shield/policy", options),

  target: (options) => request("/__shield/target", options),
  checkTarget: (options) => request("/__shield/target/check", options),
  updateTarget: (url, adminToken) => request("/__shield/target", {
    method: "PUT",
    headers: adminToken ? { "x-availabilityshield-admin-token": adminToken } : undefined,
    body: JSON.stringify({ url })
  }),

  queue: (options) => request("/__shield/queue", options),

  snapshots: (limit = 16, options) => request(`/__shield/metric-snapshots?limit=${limit}`, options),

  protectedAppLoad: (options) => request("/__shield/protected-app/load", options),

  layer4Health: (options) => request("/__shield/layer4/health", options),
  layer4Metrics: (options) => request("/__shield/layer4/metrics", options),
  layer4Connections: (options) => request("/__shield/layer4/connections", options),
  layer4Blocked: (options) => request("/__shield/layer4/blocked", options),
  layer4Events: (limit = 50, options) => request(`/__shield/layer4/events?limit=${limit}`, options),

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
