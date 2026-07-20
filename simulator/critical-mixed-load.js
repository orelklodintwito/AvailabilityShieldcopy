const { createHttpClient } = require("./utils/http-client");
const { runConcurrentScenario } = require("./utils/scenario-runner");

const target = process.env.TARGET || "http://localhost:4000";
const client = createHttpClient(target);

async function main() {
  console.log("\n=== Scenario: Critical Mixed Load ===");

  await Promise.all([
    runConcurrentScenario({
      name: "Basic endpoint under load",
      client,
      path: "/api/basic",
      requests: 20,
      concurrency: 4
    }),
    runConcurrentScenario({
      name: "Search endpoint under load",
      client,
      path: "/api/search",
      requests: 35,
      concurrency: 5
    }),
    runConcurrentScenario({
      name: "Export endpoint under load",
      client,
      path: "/api/export",
      requests: 18,
      concurrency: 3
    })
  ]);
}

main();
