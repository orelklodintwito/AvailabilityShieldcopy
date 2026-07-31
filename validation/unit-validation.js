const assert = require("assert");
const queue = require("../src/gateway/queue/request-queue");
const simulations = require("../src/gateway/simulations/simulation-manager");

async function main() {
  queue.resetQueue();
  const first = await queue.acquireHeavySlot({}, { thresholds: { maxConcurrentHeavyForwarded: 1, maxGatewayQueueSize: 2 } });
  assert.equal(first.rejected, false);
  const queued = queue.acquireHeavySlot({}, { thresholds: { maxConcurrentHeavyForwarded: 1, maxGatewayQueueSize: 2, maxQueueWaitMs: 50 } });
  first.release();
  const second = await queued;
  assert.equal(second.rejected, false);
  second.release();
  assert.equal(queue.getQueueSnapshot().activeHeavyForwarded, 0);

  assert.deepEqual(Object.keys(simulations.SCENARIOS).sort(), ["basic-preservation", "heavy", "http-flood", "mitigation-demo", "normal"]);
  console.log("PASS - queue acquire/release and wait accounting");
  console.log("PASS - simulation allow-list");
}

main().catch((error) => { console.error(error); process.exit(1); });
