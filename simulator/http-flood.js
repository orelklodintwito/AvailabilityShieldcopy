const { createHttpClient } = require("./utils/http-client");
const { runConcurrentScenario } = require("./utils/scenario-runner");

const target = process.env.TARGET || "http://localhost:4000";
const endpoint = process.env.ENDPOINT || "/api/search";
const requests = Number(process.env.REQUESTS || 60);
const concurrency = Number(process.env.CONCURRENCY || 5);

const client = createHttpClient(target);

runConcurrentScenario({
  name: "Controlled HTTP Flood",
  client,
  path: endpoint,
  requests,
  concurrency
});
