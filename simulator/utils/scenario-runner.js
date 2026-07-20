const { performance } = require("perf_hooks");

async function runSequentialScenario({ name, client, path, requests, delayBetweenMs = 0 }) {
  console.log(`\n=== Scenario: ${name} ===`);
  console.log(`Target path: ${path}`);
  console.log(`Requests: ${requests}`);
  console.log("");

  const results = [];

  for (let i = 1; i <= requests; i++) {
    const startedAt = performance.now();

    try {
      const response = await client.get(path);
      const durationMs = Math.round(performance.now() - startedAt);

      const result = {
        index: i,
        status: response.status,
        durationMs,
        decision: response.headers["x-availabilityshield-decision"] || "none",
        severity: response.headers["x-availabilityshield-severity"] || "none"
      };

      results.push(result);

      console.log(
        `${String(i).padStart(2, "0")} status=${result.status} durationMs=${result.durationMs} decision=${result.decision} severity=${result.severity}`
      );
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);

      results.push({
        index: i,
        status: "error",
        durationMs,
        decision: "error",
        severity: "error"
      });

      console.log(`${String(i).padStart(2, "0")} error=${error.message} durationMs=${durationMs}`);
    }

    if (delayBetweenMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
    }
  }

  printSummary(results);

  return results;
}

async function runConcurrentScenario({ name, client, path, requests, concurrency }) {
  console.log(`\n=== Scenario: ${name} ===`);
  console.log(`Target path: ${path}`);
  console.log(`Requests: ${requests}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log("");

  const results = [];
  let nextIndex = 1;

  async function worker() {
    while (nextIndex <= requests) {
      const currentIndex = nextIndex++;
      const startedAt = performance.now();

      try {
        const response = await client.get(path);
        const durationMs = Math.round(performance.now() - startedAt);

        const result = {
          index: currentIndex,
          status: response.status,
          durationMs,
          decision: response.headers["x-availabilityshield-decision"] || "none",
          severity: response.headers["x-availabilityshield-severity"] || "none"
        };

        results.push(result);

        console.log(
          `${String(currentIndex).padStart(2, "0")} status=${result.status} durationMs=${result.durationMs} decision=${result.decision} severity=${result.severity}`
        );
      } catch (error) {
        const durationMs = Math.round(performance.now() - startedAt);

        results.push({
          index: currentIndex,
          status: "error",
          durationMs,
          decision: "error",
          severity: "error"
        });

        console.log(`${String(currentIndex).padStart(2, "0")} error=${error.message} durationMs=${durationMs}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  results.sort((a, b) => a.index - b.index);
  printSummary(results);

  return results;
}

function printSummary(results) {
  const summary = {
    total: results.length,
    status200: results.filter((r) => r.status === 200).length,
    status429: results.filter((r) => r.status === 429).length,
    status503: results.filter((r) => r.status === 503).length,
    errors: results.filter((r) => r.status === "error").length,
    allow: results.filter((r) => r.decision === "allow").length,
    delay: results.filter((r) => r.decision === "delay").length,
    queue: results.filter((r) => r.decision === "queue").length,
    drop: results.filter((r) => r.decision === "drop").length,
    limit: results.filter((r) => r.decision === "limit").length,
    alert: results.filter((r) => r.decision === "alert").length
  };

  console.log("\nSummary:");
  console.table(summary);
}

module.exports = {
  runSequentialScenario,
  runConcurrentScenario
};
