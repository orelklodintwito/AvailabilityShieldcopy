const { insertDocument, findRecentDocuments, safeJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

async function writeSecurityEvent(context = {}) {
  const event = {
    type: "security_event",
    requestId: context.requestId ?? null,
    ip: context.ip ?? null,
    method: context.method ?? null,
    endpoint: context.endpoint ?? null,
    originalUrl: context.originalUrl ?? null,
    decision: context.decision ?? "allow",
    severity: context.severity ?? "normal",
    reason: context.reason ?? null,
    queueWaitMs: context.queueWaitMs ?? 0,
    timestamp: nowIso()
  };

  await insertDocument("security_events", {
    ...event,
    event: safeJson(event)
  });
}

function mapSecurityEventDocument(document) {
  return {
    id: String(document._id),
    timestamp: document.timestamp,
    requestId: document.requestId,
    ip: document.ip,
    method: document.method,
    endpoint: document.endpoint,
    decision: document.decision,
    severity: document.severity,
    reason: document.reason,
    queueWaitMs: document.queueWaitMs,
    event: document.event || {}
  };
}

async function getRecentSecurityEvents(limit = 50) {
  const documents = await findRecentDocuments("security_events", limit);
  return documents.map(mapSecurityEventDocument);
}

module.exports = {
  writeSecurityEvent,
  getRecentSecurityEvents
};
