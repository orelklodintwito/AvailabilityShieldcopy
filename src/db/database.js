const { MongoClient } = require("mongodb");

const MONGODB_URI = (process.env.MONGODB_URI || "").trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "availabilityshield";

let mongoClientPromise = null;
let mongoClient = null;
let mongoDbPromise = null;
let mongoUnavailable = false;
const memoryCollections = new Map();
let memoryId = 0;

function getCollectionMemory(name) {
  if (!memoryCollections.has(name)) memoryCollections.set(name, []);
  return memoryCollections.get(name);
}

async function getMongoDb() {
  if (!MONGODB_URI) return null;

  if (!mongoDbPromise) {
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 5000),
      socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 10000)
    });
    mongoClientPromise = mongoClient.connect();
    const connection = mongoClientPromise.then(async (client) => {
      const db = client.db(MONGODB_DB_NAME);
      await Promise.all([
        db.collection("request_logs").createIndex({ createdAt: -1 }),
        db.collection("security_events").createIndex({ createdAt: -1 }),
        db.collection("metric_snapshots").createIndex({ createdAt: -1 }),
        db.collection("target_configs").createIndex({ key: 1 }, { unique: true })
      ]);
      return db;
    });
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("MongoDB connection timed out")), Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 5000));
    });
    mongoDbPromise = Promise.race([connection, timeout]).catch((error) => {
      mongoUnavailable = true;
      mongoClient?.close().catch(() => {});
      mongoClient = null;
      console.error(`[AvailabilityShield] MongoDB unavailable: ${error.message}. Using development memory storage.`);
      return null;
    });
  }

  return mongoDbPromise;
}

function databaseMode() {
  return MONGODB_URI && !mongoUnavailable ? "mongodb" : "memory";
}

async function insertDocument(collectionName, document) {
  const db = await getMongoDb();
  if (db) {
    const result = await db.collection(collectionName).insertOne({
      ...document,
      createdAt: document.createdAt || new Date()
    });
    return result.insertedId.toString();
  }

  const record = {
    _id: String(++memoryId),
    ...document,
    createdAt: document.createdAt || new Date()
  };
  getCollectionMemory(collectionName).push(record);
  return record._id;
}

function sortDocuments(documents) {
  return documents.sort((a, b) => {
    const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
    const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
    return bTime - aTime;
  });
}

function matchesFilter(document, filter = {}) {
  return Object.entries(filter).every(([key, value]) => document[key] === value);
}

async function findRecentDocuments(collectionName, limit = 50, filter = {}) {
  const db = await getMongoDb();
  if (db) {
    return db.collection(collectionName)
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray();
  }

  return sortDocuments(getCollectionMemory(collectionName).filter((item) => matchesFilter(item, filter)))
    .slice(0, limit);
}

async function findOneDocument(collectionName, filter = {}) {
  const db = await getMongoDb();
  if (db) return db.collection(collectionName).findOne(filter, { sort: { updatedAt: -1, createdAt: -1 } });

  return sortDocuments(getCollectionMemory(collectionName).filter((item) => matchesFilter(item, filter)))[0] || null;
}

async function upsertDocument(collectionName, filter, document) {
  const db = await getMongoDb();
  if (db) {
    await db.collection(collectionName).updateOne(
      filter,
      { $set: { ...document, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return findOneDocument(collectionName, filter);
  }

  const records = getCollectionMemory(collectionName);
  const index = records.findIndex((item) => matchesFilter(item, filter));
  const record = {
    ...(index >= 0 ? records[index] : { _id: String(++memoryId), createdAt: new Date() }),
    ...document,
    ...filter,
    updatedAt: new Date()
  };
  if (index >= 0) records[index] = record;
  else records.push(record);
  return record;
}

function safeJson(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (error) {
    return { serializationError: error.message };
  }
}

function parseJson(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function closeDb() {
  if (mongoClient) await mongoClient.close().catch(() => {});
  mongoClient = null;
  mongoClientPromise = null;
  mongoDbPromise = null;
  mongoUnavailable = false;
}

module.exports = {
  getDb: getMongoDb,
  getDbName: () => MONGODB_DB_NAME,
  getDbMode: databaseMode,
  insertDocument,
  findRecentDocuments,
  findOneDocument,
  upsertDocument,
  safeJson,
  parseJson,
  closeDb
};
