const { sleep } = require("../../shared/sleep");

async function getBasic(req, res) {
  const extraDelayMs = req.appLoad?.extraDelayMs || 0;

  if (extraDelayMs > 0) {
    await sleep(extraDelayMs);
  }

  res.json({
    endpoint: "/api/basic",
    type: "basic",
    message: "Basic endpoint is available",
    degradedByHeavyLoad: extraDelayMs > 0,
    extraDelayMs,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getBasic
};
