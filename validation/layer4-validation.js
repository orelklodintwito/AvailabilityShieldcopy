const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = ["layer4/l4_guard.py", "layer4/l4-policy.json", "src/layer4/layer4-service.js"];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`FAIL - Layer 4 files missing: ${missing.join(", ")}`);
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(path.join(root, "layer4/l4-policy.json"), "utf8"));
const checks = [
  ["Layer 4 is local-only", policy.localOnly === true],
  ["Layer 4 warning threshold configured", Number(policy.warningSynPerWindow) > 0],
  ["Layer 4 drop threshold configured", Number(policy.dropSynPerWindow) > Number(policy.warningSynPerWindow)]
];
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} - ${name}`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
