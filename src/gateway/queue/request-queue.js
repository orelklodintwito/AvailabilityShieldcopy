const state = {
  activeHeavyForwarded: 0,
  queuedHeavy: 0,
  totalQueued: 0,
  totalDequeued: 0,
  totalQueueRejected: 0,
  maxObservedQueueSize: 0,
  waiting: [],
  maxConcurrentHeavyForwarded: 4
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

    state.queuedHeavy = state.waiting.length;
    state.activeHeavyForwarded += 1;
    state.totalDequeued += 1;

    item.resolve({
      rejected: false,
      queued: true,
      waitMs: Date.now() - item.enqueuedAt,
      release: createRelease()
    });
  }
}

function acquireHeavySlot(context, policy) {
  const config = getQueueConfig(policy);

  state.maxConcurrentHeavyForwarded = config.maxConcurrentHeavyForwarded;

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
    state.waiting.push({
      context,
      enqueuedAt: Date.now(),
      resolve
    });

    state.queuedHeavy = state.waiting.length;
    state.maxObservedQueueSize = Math.max(
      state.maxObservedQueueSize,
      state.waiting.length
    );
  });
}

function getQueueSnapshot() {
  return {
    activeHeavyForwarded: state.activeHeavyForwarded,
    queuedHeavy: state.waiting.length,
    totalQueued: state.totalQueued,
    totalDequeued: state.totalDequeued,
    totalQueueRejected: state.totalQueueRejected,
    maxObservedQueueSize: state.maxObservedQueueSize,
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
  state.waiting.splice(0, state.waiting.length);
}

module.exports = {
  acquireHeavySlot,
  getQueueSnapshot,
  resetQueue
};
