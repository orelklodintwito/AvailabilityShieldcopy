const { createHttpClient } = require("./utils/http-client");
const {
  runSequentialScenario,
  runConcurrentScenario
} = require("./utils/scenario-runner");

const DIRECT_TARGET = "http://localhost:3000";
const SHIELD_TARGET = "http://localhost:4000";

function summarize(results) {
  const totalDurationMs = results.reduce((sum, item) => sum + item.durationMs, 0);

  return {
    total: results.length,
    status200: results.filter((r) => r.status === 200).length,
    status429: results.filter((r) => r.status === 429).length,
    status503: results.filter((r) => r.status === 503).length,
    errors: results.filter((r) => r.status === "error").length,
    allow: results.filter((r) => r.decision === "allow").length,
    delay: results.filter((r) => r.decision === "delay").length,
    drop: results.filter((r) => r.decision === "drop").length,
    averageDurationMs: Math.round(totalDurationMs / Math.max(results.length, 1))
  };
}

async function resetDemoState() {
  const shieldClient = createHttpClient(SHIELD_TARGET);
  const appClient = createHttpClient(DIRECT_TARGET);

  await shieldClient.post("/__shield/reset");
  await appClient.post("/__app/reset");
}

async function runHeavyComparison() {
  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  console.log("\n############################");
  console.log("Comparison: Heavy Endpoint Abuse");
  console.log("############################");

  const withoutShield = await runSequentialScenario({
    name: "WITHOUT Shield: direct protected app",
    client: directClient,
    path: "/api/export",
    requests: 18,
    delayBetweenMs: 0
  });

  await resetDemoState();

  const withShield = await runSequentialScenario({
    name: "WITH Shield: AvailabilityShield gateway",
    client: shieldClient,
    path: "/api/export",
    requests: 18,
    delayBetweenMs: 0
  });

  console.log("\nFinal comparison:");
  console.table({
    withoutShield: summarize(withoutShield),
    withShield: summarize(withShield)
  });
}

async function runFloodComparison() {
  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  console.log("\n############################");
  console.log("Comparison: HTTP Flood");
  console.log("############################");

  const withoutShield = await runConcurrentScenario({
    name: "WITHOUT Shield: direct protected app",
    client: directClient,
    path: "/api/search",
    requests: 60,
    concurrency: 5
  });

  await resetDemoState();

  const withShield = await runConcurrentScenario({
    name: "WITH Shield: AvailabilityShield gateway",
    client: shieldClient,
    path: "/api/search",
    requests: 60,
    concurrency: 5
  });

  console.log("\nFinal comparison:");
  console.table({
    withoutShield: summarize(withoutShield),
    withShield: summarize(withShield)
  });
}

async function main() {
  const scenario = process.env.SCENARIO || "heavy";

  if (scenario === "flood") {
    await runFloodComparison();
    return;
  }

  await runHeavyComparison();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
