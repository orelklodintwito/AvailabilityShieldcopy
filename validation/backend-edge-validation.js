const axios = require("axios");

const gateway = axios.create({ baseURL: "http://localhost:4000", validateStatus: () => true, timeout: 5000 });

async function main() {
  const checks = [];
  const overview = await gateway.get("/__shield/overview");
  checks.push(["API success envelope", overview.status === 200 && overview.data.success === true && overview.data.data]);

  const invalidLimit = await gateway.get("/__shield/events?limit=invalid");
  checks.push(["Invalid query limit rejected", invalidLimit.status === 400 && invalidLimit.data.success === false]);

  const oversizedLimit = await gateway.get("/__shield/events?limit=9999");
  checks.push(["Oversized query limit rejected", oversizedLimit.status === 400]);

  const invalidSimulation = await gateway.post("/__shield/simulations", { scenario: "shell-command", requests: 1 });
  checks.push(["Simulation allow-list enforced", invalidSimulation.status === 400 && invalidSimulation.data.success === false]);

  const queue = await gateway.get("/__shield/queue");
  checks.push(["Queue exposes wait metrics", queue.status === 200 && "averageWaitMs" in queue.data.queue && "maximumWaitMs" in queue.data.queue]);

  for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} - ${name}`);
  if (checks.some(([, passed]) => !passed)) process.exit(1);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
