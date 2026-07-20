const BASE_URL =
  import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      body || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

export const shieldApi = {
  health: () => request("/__shield/health"),

  metrics: () => request("/__shield/metrics"),

  events: (limit = 20) =>
    request(`/__shield/events?limit=${limit}`),

  requests: (limit = 30) =>
    request(`/__shield/requests?limit=${limit}`),

  policy: () => request("/__shield/policy"),

  queue: () => request("/__shield/queue"),

  snapshots: (limit = 16) =>
    request(`/__shield/metric-snapshots?limit=${limit}`),

  reset: () =>
    request("/__shield/reset", {
      method: "POST"
    })
};