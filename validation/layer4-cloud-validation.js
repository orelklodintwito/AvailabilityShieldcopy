process.env.MONGODB_URI = "";

const cloud = require("../src/layer4/layer4-cloud.service");

async function main() {
  const now = new Date().toISOString();
  const snapshot = await cloud.saveAgentHeartbeat({
    agentId: "validation-agent",
    running: true,
    mode: "monitor",
    stats: {
      totalPacketsSeen: 10,
      totalTcpSynSeen: 3,
      totalAllowed: 3,
      bySource: { "127.0.0.1": { totalSyn: 3, allowed: 3 } }
    },
    timestamp: now
  });
  const events = await cloud.saveAgentEvents({
    agentId: "validation-agent",
    events: [{ type: "layer4_syn_decision", decision: "allow", timestamp: now }]
  });
  const latest = await cloud.getLatestAgentSnapshot("validation-agent");
  const recentEvents = await cloud.getRecentAgentEvents();

  const checks = [
    ["Agent heartbeat is persisted", snapshot.agentId === "validation-agent"],
    ["Agent counters are normalized", latest?.stats?.totalTcpSynSeen === 3],
    ["Agent snapshot is fresh", latest?.running === true && latest?.stale === false],
    ["Agent events are persisted", events.accepted === 1 && recentEvents.length === 1]
  ];

  for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} - ${name}`);
  if (checks.some(([, passed]) => !passed)) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
