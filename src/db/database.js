const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, "data", "availabilityshield.db");
const DB_PATH = process.env.AVAILABILITYSHIELD_DB_PATH || DEFAULT_DB_PATH;
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

let db = null;

function getDbPath() {
  return DB_PATH;
}

function getDb() {
  if (db) {
    return db;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);

  return db;
}

function safeJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch (error) {
    return JSON.stringify({
      serializationError: error.message
    });
  }
}

function parseJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  getDb,
  getDbPath,
  safeJson,
  parseJson
};
