const fs = require("fs");
const path = require("path");

const POLICY_PATH = path.resolve(__dirname, "../../../config/site-policy.json");

function loadPolicy() {
  const rawPolicy = fs.readFileSync(POLICY_PATH, "utf8");
  const policy = JSON.parse(rawPolicy);

  if (process.env.PROTECTED_TARGET) {
    policy.protectedTarget = process.env.PROTECTED_TARGET;
  }

  return policy;
}

function getEndpointPolicy(endpointPath) {
  const policy = loadPolicy();
  return policy.endpoints[endpointPath] || null;
}

module.exports = {
  loadPolicy,
  getEndpointPolicy
};
