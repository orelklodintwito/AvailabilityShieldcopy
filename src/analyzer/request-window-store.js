const ipWindows = new Map();
const endpointWindows = new Map();

function pruneOldTimestamps(items, now, windowMs) {
  while (items.length > 0 && now - items[0] > windowMs) {
    items.shift();
  }
}

function recordAndCount(map, key, now, windowMs) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  const items = map.get(key);
  pruneOldTimestamps(items, now, windowMs);
  items.push(now);

  return items.length;
}

function recordRequestInWindow(context, policy) {
  const now = Date.now();
  const windowMs = policy.windowMs || 60000;

  const ipRequestCount = recordAndCount(ipWindows, context.ip, now, windowMs);
  const endpointRequestCount = recordAndCount(endpointWindows, context.endpoint, now, windowMs);

  return {
    windowMs,
    ipRequestCount,
    endpointRequestCount
  };
}

function getWindowSnapshot() {
  const byIp = {};
  const byEndpoint = {};

  for (const [ip, timestamps] of ipWindows.entries()) {
    byIp[ip] = timestamps.length;
  }

  for (const [endpoint, timestamps] of endpointWindows.entries()) {
    byEndpoint[endpoint] = timestamps.length;
  }

  return {
    byIp,
    byEndpoint
  };
}

function resetWindows() {
  ipWindows.clear();
  endpointWindows.clear();
}

module.exports = {
  recordRequestInWindow,
  getWindowSnapshot,
  resetWindows
};
