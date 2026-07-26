const state = {
  activeHeavyForwarded: 0,
  queuedHeavy: 0,
  totalQueued: 0,
  totalDequeued: 0,
  totalQueueRejected: 0,
  maxObservedQueueSize: 0,
  totalWaitMs: 0,
  maxWaitMs: 0,
  waiting: [],
  maxConcurrentHeavyForwarded: 4,
  maxGatewayQueueSize: 100
};

function getQueueConfig(policy) {
  const thresholds = policy.thresholds || {};

  return {
    maxConcurrentHeavyForwarded: thresholds.maxConcurrentHeavyForwarded || 4,
    maxGatewayQueueSize: thresholds.maxGatewayQueueSize || 100
  };
}

function createRelease() {
  let released = false;

  return function release() {
    if (released) {
      return;
    }

    released = true;
    state.activeHeavyForwarded = Math.max(0, state.activeHeavyForwarded - 1);
    drainQueue();
  };
}

function drainQueue() {
  while (
    state.waiting.length > 0 &&
    state.activeHeavyForwarded < state.maxConcurrentHeavyForwarded
  ) {
    const item = state.waiting.shift();
    if (item.timer) clearTimeout(item.timer);

    state.queuedHeavy = state.waiting.length;
    state.activeHeavyForwarded += 1;
    state.totalDequeued += 1;

    const waitMs = Date.now() - item.enqueuedAt;
    state.totalWaitMs += waitMs;
    state.maxWaitMs = Math.max(state.maxWaitMs, waitMs);
    item.resolve({
      rejected: false,
      queued: true,
      waitMs,
      release: createRelease()
    });
  }
}

function acquireHeavySlot(context, policy) {
  const config = getQueueConfig(policy);

  state.maxConcurrentHeavyForwarded = config.maxConcurrentHeavyForwarded;
  state.maxGatewayQueueSize = config.maxGatewayQueueSize;

  if (state.activeHeavyForwarded < config.maxConcurrentHeavyForwarded) {
    state.activeHeavyForwarded += 1;

    return Promise.resolve({
      rejected: false,
      queued: false,
      waitMs: 0,
      release: createRelease()
    });
  }

  if (state.waiting.length >= config.maxGatewayQueueSize) {
    state.totalQueueRejected += 1;

    return Promise.resolve({
      rejected: true,
      queued: false,
      waitMs: 0,
      release: () => {}
    });
  }

  state.totalQueued += 1;

  return new Promise((resolve) => {
    const timeoutMs = Number(thresholdsOrDefault(policy, "maxQueueWaitMs", 15000));
    const item = {
      context,
      enqueuedAt: Date.now(),
      resolve
    };
    item.timer = setTimeout(() => {
      const index = state.waiting.indexOf(item);
      if (index === -1) return;
      state.waiting.splice(index, 1);
      state.queuedHeavy = state.waiting.length;
      resolve({ rejected: true, timedOut: true, queued: false, waitMs: Date.now() - item.enqueuedAt, release: () => {} });
    }, timeoutMs);
    state.waiting.push(item);

    state.queuedHeavy = state.waiting.length;
    state.maxObservedQueueSize = Math.max(
      state.maxObservedQueueSize,
      state.waiting.length
    );
  });
}

function thresholdsOrDefault(policy, key, fallback) {
  return policy?.thresholds?.[key] ?? fallback;
}

function getQueueSnapshot() {
  return {
    activeHeavyForwarded: state.activeHeavyForwarded,
    queuedHeavy: state.waiting.length,
    totalQueued: state.totalQueued,
    totalDequeued: state.totalDequeued,
    totalQueueRejected: state.totalQueueRejected,
    maxObservedQueueSize: state.maxObservedQueueSize,
    averageWaitMs: state.totalDequeued ? Math.round(state.totalWaitMs / state.totalDequeued) : 0,
    maximumWaitMs: state.maxWaitMs,
    configuredMaximumQueueSize: state.maxGatewayQueueSize || 100,
    maxConcurrentHeavyForwarded: state.maxConcurrentHeavyForwarded
  };
}

function resetQueue() {
  state.activeHeavyForwarded = 0;
  state.queuedHeavy = 0;
  state.totalQueued = 0;
  state.totalDequeued = 0;
  state.totalQueueRejected = 0;
  state.maxObservedQueueSize = 0;
  state.maxGatewayQueueSize = 100;
  state.totalWaitMs = 0;
  state.maxWaitMs = 0;
  for (const item of state.waiting) {
    if (item.timer) clearTimeout(item.timer);
    item.resolve({ rejected: true, reset: true, queued: false, waitMs: 0, release: () => {} });
  }
  state.waiting.splice(0, state.waiting.length);
}

module.exports = {
  acquireHeavySlot,
  getQueueSnapshot,
  resetQueue
};
