require("dotenv").config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

const {
  getDb,
  getDbMode,
  getDbName,
  findRecentDocuments
} = require("../src/db/database");

async function main() {
  // Open the configured MongoDB connection (or the explicit development
  // memory adapter when MONGODB_URI is not configured).
  await getDb();
  const [requests, events, snapshots] = await Promise.all([
    findRecentDocuments("request_logs", 10),
    findRecentDocuments("security_events", 10),
    findRecentDocuments("metric_snapshots", 10)
  ]);

  console.log(JSON.stringify({
    database: { mode: getDbMode(), name: getDbName() },
    requestLogs: requests.length,
    securityEvents: events.length,
    metricSnapshots: snapshots.length,
    recentRequests: requests,
    recentSecurityEvents: events
  }, null, 2));
}

main().catch((error) => {
  console.error(`Database inspection failed: ${error.message}`);
  process.exit(1);
});
