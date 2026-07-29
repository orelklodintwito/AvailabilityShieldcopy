const fs = require("fs");
const path = require("path");
const { getTarget } = require("../targets/target-manager");

const POLICY_PATH = path.resolve(__dirname, "../../../config/site-policy.json");

function loadPolicy() {
  const rawPolicy = fs.readFileSync(POLICY_PATH, "utf8");
  const policy = JSON.parse(rawPolicy);

  policy.protectedTarget = getTarget() || policy.protectedTarget;

  return policy;
}

function getEndpointPolicy(endpointPath) {
  const policy = loadPolicy();
  if (policy.endpoints[endpointPath]) return policy.endpoints[endpointPath];

  // Unknown paths on an externally supplied site still receive the generic
  // Layer 7 rate-limit policy instead of bypassing the Gateway completely.
  return policy.defaultEndpoint || null;
}

module.exports = {
  loadPolicy,
  getEndpointPolicy
};
