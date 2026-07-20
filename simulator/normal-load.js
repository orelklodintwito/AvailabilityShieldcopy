const { createHttpClient } = require("./utils/http-client");
const { runSequentialScenario } = require("./utils/scenario-runner");

const target = process.env.TARGET || "http://localhost:4000";
const client = createHttpClient(target);

runSequentialScenario({
  name: "Normal Load",
  client,
  path: "/api/basic",
  requests: 10,
  delayBetweenMs: 300
});
