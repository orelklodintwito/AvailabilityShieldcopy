const { performance } = require("perf_hooks");
const { createHttpClient } = require("./utils/http-client");

const DIRECT_TARGET = "http://localhost:3000";
const SHIELD_TARGET = "http://localhost:4000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarize(results) {
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  return {
    total: results.length,
    status200: results.filter((r) => r.status === 200).length,
    status503: results.filter((r) => r.status === 503).length,
    degraded: results.filter((r) => r.degradedByHeavyLoad === true).length,
    allow: results.filter((r) => r.decision === "allow").length,
    queue: results.filter((r) => r.decision === "queue").length,
    delay: results.filter((r) => r.decision === "delay").length,
    drop: results.filter((r) => r.decision === "drop").length,
    averageDurationMs: Math.round(totalDurationMs / Math.max(results.length, 1))
  };
}

async function resetDemoState() {
  const directClient = createHttpClient(DIRECT_TARGET);
  const shieldClient = createHttpClient(SHIELD_TARGET);

  await directClient.post("/__app/reset");
  await shieldClient.post("/__shield/reset");
}

async function requestOnce(client, path, index, label) {
  const startedAt = performance.now();

  try {
    const response = await client.get(path);
    const durationMs = Math.round(performance.now() - startedAt);

    return {
      label,
      index,
      path,
      status: response.status,
      durationMs,
      decision: response.headers["x-availabilityshield-decision"] || "none",
      severity: response.headers["x-availabilityshield-severity"] || "none",
      degradedByHeavyLoad: response.data?.degradedByHeavyLoad === true
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);

    return {
      label,
      index,
      path,
      status: "error",
      durationMs,
      decision: "error",
      severity: "error",
      degradedByHeavyLoad: false,
      error: error.message
    };
  }
}

async function runHeavyBurst(client, label) {
  const requests = Number(process.env.HEAVY_REQUESTS || 18);
  const concurrency = Number(process.env.HEAVY_CONCURRENCY || 8);
  let nextIndex = 1;
  const results = [];

  async function worker() {
    while (nextIndex <= requests) {
      const current = nextIndex++;
      const result = await requestOnce(client, "/api/export", current, label);
      results.push(result);

      console.log(
        `${label} HEAVY ${String(current).padStart(2, "0")} status=${result.status} durationMs=${result.durationMs} decision=${result.decision} severity=${result.severity}`
      );
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.sort((a, b) => a.index - b.index);
}

async function runBasicProbes(client, label) {
  const requests = Number(process.env.BASIC_REQUESTS || 12);
  const intervalMs = Number(process.env.BASIC_INTERVAL_MS || 100);
  const results = [];

  for (let i = 1; i <= requests; i++) {
    const result = await requestOnce(client, "/api/basic", i, label);
    results.push(result);

    console.log(
      `${label} BASIC ${String(i).padStart(2, "0")} status=${result.status} durationMs=${result.durationMs} decision=${result.decision} severity=${result.severity} degraded=${result.degradedByHeavyLoad}`
    );

    await sleep(intervalMs);
  }

  return results;
}

async function runScenario({ name, target }) {
  console.log(`\n############################`);
  console.log(name);
  console.log(`Target: ${target}`);
  console.log(`############################\n`);

  const client = createHttpClient(target);

  const [heavyResults, basicResults] = await Promise.all([
    runHeavyBurst(client, name),
    runBasicProbes(client, name)
  ]);

  console.log(`\n${name} summary:`);
  console.table({
    heavy: summarize(heavyResults),
    basic: summarize(basicResults)
  });

  return {
    heavyResults,
    basicResults
  };
}

async function main() {
  await resetDemoState();

  const withoutShield = await runScenario({
    name: "WITHOUT Shield",
    target: DIRECT_TARGET
  });

  await resetDemoState();

  const withShield = await runScenario({
    name: "WITH Shield",
    target: SHIELD_TARGET
  });

  console.log("\nFinal Basic Preservation Comparison:");
  console.table({
    withoutShieldBasic: summarize(withoutShield.basicResults),
    withShieldBasic: summarize(withShield.basicResults),
    withoutShieldHeavy: summarize(withoutShield.heavyResults),
    withShieldHeavy: summarize(withShield.heavyResults)
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
