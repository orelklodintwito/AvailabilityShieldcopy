const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "frontend");
const required = [
  "src/App.jsx",
  "src/services/api.js",
  "src/components/AttackSimulator.jsx",
  "vite.config.js"
];

const failures = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (failures.length) {
  console.error(`Frontend validation failed: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("PASS - Frontend source structure");
console.log("PASS - Frontend validation");
