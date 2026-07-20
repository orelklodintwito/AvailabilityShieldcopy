const axios = require("axios");

function assertLocalTarget(baseUrl) {
  const parsed = new URL(baseUrl);
  const allowedHosts = ["localhost", "127.0.0.1", "::1"];

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`Unsafe simulator target blocked: ${baseUrl}. Simulator may only run against localhost.`);
  }
}

function createHttpClient(baseUrl) {
  assertLocalTarget(baseUrl);

  return axios.create({
    baseURL: baseUrl,
    timeout: 20000,
    validateStatus: () => true
  });
}

module.exports = {
  createHttpClient,
  assertLocalTarget
};
