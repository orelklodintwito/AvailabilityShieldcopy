const { createHttpClient } = require("./utils/http-client");
const { runSequentialScenario } = require("./utils/scenario-runner");

const target = process.env.TARGET || "http://localhost:4000";
const endpoint = process.env.ENDPOINT || "/api/export";
const requests = Number(process.env.REQUESTS || 18);

const client = createHttpClient(target);

runSequentialScenario({
  name: "Heavy Endpoint Abuse",
  client,
  path: endpoint,
  requests,
  delayBetweenMs: 0
});
