const { insertDocument, findRecentDocuments, safeJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

function getContextValue(context, key, fallback = null) {
  return context?.[key] ?? fallback;
}

function calculateDurationMs(context, result) {
  if (result && Number.isFinite(result.durationMs)) return result.durationMs;
  if (context && Number.isFinite(context.startedAt)) return Date.now() - context.startedAt;
  return null;
}

async function writeRequestLog(context = {}, result = {}) {
  const statusCode = result.statusCode ?? null;
  await insertDocument("request_logs", {
    timestamp: result.timestamp || nowIso(),
    requestId: getContextValue(context, "requestId"),
    ip: getContextValue(context, "ip"),
    method: getContextValue(context, "method"),
    endpoint: getContextValue(context, "endpoint"),
    originalUrl: getContextValue(context, "originalUrl"),
    decision: getContextValue(context, "decision", "allow"),
    severity: getContextValue(context, "severity", "normal"),
    reason: getContextValue(context, "reason"),
    statusCode,
    durationMs: calculateDurationMs(context, result),
    queueWaitMs: getContextValue(context, "queueWaitMs", 0),
    isError: statusCode >= 500,
    context: safeJson(context),
    result: safeJson(result)
  });
}

function mapRequestDocument(document) {
  return {
    id: String(document._id),
    timestamp: document.timestamp,
    requestId: document.requestId,
    ip: document.ip,
    method: document.method,
    endpoint: document.endpoint,
    originalUrl: document.originalUrl,
    decision: document.decision,
    severity: document.severity,
    reason: document.reason,
    statusCode: document.statusCode,
    durationMs: document.durationMs,
    queueWaitMs: document.queueWaitMs,
    isError: Boolean(document.isError),
    context: document.context || {},
    result: document.result || {}
  };
}

async function getRecentRequestLogs(limit = 50) {
  const documents = await findRecentDocuments("request_logs", limit);
  return documents.map(mapRequestDocument);
}

module.exports = {
  writeRequestLog,
  getRecentRequestLogs
};
