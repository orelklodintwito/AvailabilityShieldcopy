const { createHttpClient } = require("../simulator/utils/http-client");
const {
  runSequentialScenario,
  runConcurrentScenario
} = require("../simulator/utils/scenario-runner");

const DIRECT_TARGET = "http://localhost:3000";
const SHIELD_TARGET = "http://localhost:4000";

function count(results, predicate) {
  return results.filter(predicate).length;
}

function summarize(results) {
  const totalDurationMs = results.reduce((sum, item) => sum + item.durationMs, 0);

  return {
    total: results.length,
    status200: count(results, (r) => r.status === 200),
    status503: count(results, (r) => r.status === 503),
    allow: count(results, (r) => r.decision === "allow"),
    delay: count(results, (r) => r.decision === "delay"),
    queue: count(results, (r) => r.decision === "queue"),
    drop: count(results, (r) => r.decision === "drop"),
    averageDurationMs: Math.round(totalDurationMs / Math.max(results.length, 1))
  };
}

function printCheck(name, passed, details = "") {
  const status = passed ? "PASS" : "FAIL";
  console.log(`${status} - ${name}${details ? ` - ${details}` : ""}`);
  return passed;
}

async function resetDemoState() {
  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  await directClient.post("/__app/reset");
  await shieldClient.post("/__shield/reset");
}

async function getJson(client, path) {
  const response = await client.get(path);
  return response.data;
}

async function validateHealth() {
  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  const appHealth = await getJson(directClient, "/health");
  const shieldHealth = await getJson(shieldClient, "/__shield/health");

  const checks = [];

  checks.push(printCheck("Protected app health", appHealth.status === "ok"));
  checks.push(printCheck("Gateway health", shieldHealth.status === "ok"));
  checks.push(printCheck("Gateway points to protected app", shieldHealth.protectedTarget === DIRECT_TARGET));

  return checks.every(Boolean);
}

async function validateHeavyEndpointAbuse() {
  await resetDemoState();

  const shieldClient = createHttpClient(SHIELD_TARGET);

  const results = await runSequentialScenario({
    name: "Validation: Heavy Endpoint Abuse",
    client: shieldClient,
    path: "/api/export",
    requests: 18,
    delayBetweenMs: 0
  });

  const summary = summarize(results);
  console.table({ heavyEndpointAbuse: summary });

  const checks = [];
  checks.push(printCheck("Heavy endpoint has queue or delay/drop mitigation", summary.queue + summary.delay + summary.drop > 0));
  checks.push(printCheck("Heavy endpoint preserves most requests", summary.status200 >= 14, `status200=${summary.status200}`));

  return checks.every(Boolean);
}

async function validateConcurrentFloodProtection() {
  await resetDemoState();

  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  const withoutShield = await runConcurrentScenario({
    name: "Validation: Direct app flood",
    client: directClient,
    path: "/api/search",
    requests: 30,
    concurrency: 8
  });

  await resetDemoState();

  const withShield = await runConcurrentScenario({
    name: "Validation: Shielded flood",
    client: shieldClient,
    path: "/api/search",
    requests: 30,
    concurrency: 8
  });

  const directSummary = summarize(withoutShield);
  const shieldSummary = summarize(withShield);

  console.table({
    directFlood: directSummary,
    shieldedFlood: shieldSummary
  });

  const appLoad = await getJson(directClient, "/__app/load");
  const shieldMetrics = await getJson(shieldClient, "/__shield/metrics");
  const queueStatus = await getJson(shieldClient, "/__shield/queue");

  const checks = [];
  checks.push(printCheck("Direct app flood demonstrates overload", directSummary.status503 > 0, `status503=${directSummary.status503}`));
  checks.push(printCheck("Shielded flood prevents overload errors", shieldSummary.status503 === 0, `status503=${shieldSummary.status503}`));
  checks.push(printCheck("Shielded flood uses queue", shieldSummary.queue > 0, `queue=${shieldSummary.queue}`));
  checks.push(printCheck("Protected app rejected zero requests after shielded flood", appLoad.rejectedDueToOverload === 0, `rejectedDueToOverload=${appLoad.rejectedDueToOverload}`));
  checks.push(printCheck("Gateway metrics has zero errors after shielded flood", shieldMetrics.metrics.totalErrors === 0, `totalErrors=${shieldMetrics.metrics.totalErrors}`));
  checks.push(printCheck("Gateway queue processed requests", queueStatus.queue.totalQueued > 0 && queueStatus.queue.totalQueueRejected === 0));

  return checks.every(Boolean);
}

async function validateBasicPreservation() {
  await resetDemoState();

  const shieldClient = createHttpClient(SHIELD_TARGET);

  const heavyRequests = 18;
  const basicRequests = 12;

  let nextHeavy = 1;
  const heavyResults = [];
  const basicResults = [];

  async function requestOnce(path, index, label) {
    const startedAt = Date.now();
    const response = await shieldClient.get(path);

    return {
      index,
      path,
      label,
      status: response.status,
      durationMs: Date.now() - startedAt,
      decision: response.headers["x-availabilityshield-decision"] || "none",
      severity: response.headers["x-availabilityshield-severity"] || "none",
      degradedByHeavyLoad: response.data?.degradedByHeavyLoad === true
    };
  }

  async function heavyWorker() {
    while (nextHeavy <= heavyRequests) {
      const index = nextHeavy++;
      heavyResults.push(await requestOnce("/api/export", index, "heavy"));
    }
  }

  async function basicProbeWorker() {
    for (let i = 1; i <= basicRequests; i++) {
      basicResults.push(await requestOnce("/api/basic", i, "basic"));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  await Promise.all([
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    heavyWorker(),
    basicProbeWorker()
  ]);

  heavyResults.sort((a, b) => a.index - b.index);
  basicResults.sort((a, b) => a.index - b.index);

  const heavySummary = summarize(heavyResults);
  const basicSummary = {
    ...summarize(basicResults),
    degraded: count(basicResults, (r) => r.degradedByHeavyLoad === true)
  };

  console.table({
    shieldedHeavyDuringBasicPreservation: heavySummary,
    shieldedBasicDuringHeavyLoad: basicSummary
  });

  const checks = [];
  checks.push(printCheck("Basic endpoint remains fully available", basicSummary.status200 === basicRequests, `status200=${basicSummary.status200}/${basicRequests}`));
  checks.push(printCheck("Basic endpoint is not degraded under shield", basicSummary.degraded === 0, `degraded=${basicSummary.degraded}`));
  checks.push(printCheck("Heavy traffic is controlled by queue", heavySummary.queue > 0, `queue=${heavySummary.queue}`));
  checks.push(printCheck("No heavy request fails during shielded basic preservation", heavySummary.status503 === 0, `status503=${heavySummary.status503}`));

  return checks.every(Boolean);
}

async function main() {
  console.log("\n==============================");
  console.log("AvailabilityShield Backend Validation");
  console.log("==============================\n");

  const results = [];

  results.push(await validateHealth());
  results.push(await validateHeavyEndpointAbuse());
  results.push(await validateConcurrentFloodProtection());
  results.push(await validateBasicPreservation());

  const passed = results.every(Boolean);

  console.log("\n==============================");
  console.log(`FINAL RESULT: ${passed ? "PASS" : "FAIL"}`);
  console.log("==============================\n");

  if (!passed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Validation failed with unexpected error:");
  console.error(error);
  process.exit(1);
});
