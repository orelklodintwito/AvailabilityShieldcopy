const fs = require("fs");
const path = require("path");

function ensureDirectoryExists(filePath) {
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function appendJsonLine(filePath, data) {
  ensureDirectoryExists(filePath);

  const line = JSON.stringify({
    ...data,
    writtenAt: new Date().toISOString()
  });

  fs.appendFileSync(filePath, `${line}\n`, "utf8");
}

function readLastJsonLines(filePath, limit = 50) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();

  if (!raw) {
    return [];
  }

  return raw
    .split("\n")
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          parseError: true,
          raw: line
        };
      }
    })
    .reverse();
}

module.exports = {
  appendJsonLine,
  readLastJsonLines
};
