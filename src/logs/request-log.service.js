const { getDb, safeJson, parseJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

function getContextValue(context, key, fallback = null) {
  if (!context) {
    return fallback;
  }

  return context[key] ?? fallback;
}

function calculateDurationMs(context, result) {
  if (result && Number.isFinite(result.durationMs)) {
    return result.durationMs;
  }

  if (context && Number.isFinite(context.startedAt)) {
    return Date.now() - context.startedAt;
  }

  return null;
}

function writeRequestLog(context = {}, result = {}) {
  const db = getDb();

  const timestamp = result.timestamp || nowIso();
  const statusCode = result.statusCode ?? null;
  const durationMs = calculateDurationMs(context, result);
  const decision = getContextValue(context, "decision", "allow");
  const severity = getContextValue(context, "severity", "normal");

  const row = {
    timestamp,
    request_id: getContextValue(context, "requestId"),
    ip: getContextValue(context, "ip"),
    method: getContextValue(context, "method"),
    endpoint: getContextValue(context, "endpoint"),
    original_url: getContextValue(context, "originalUrl"),
    decision,
    severity,
    reason: getContextValue(context, "reason"),
    status_code: statusCode,
    duration_ms: durationMs,
    queue_wait_ms: getContextValue(context, "queueWaitMs", 0),
    is_error: statusCode >= 500 ? 1 : 0,
    context_json: safeJson(context),
    result_json: safeJson(result)
  };

  db.prepare(`
    INSERT INTO request_logs (
      timestamp,
      request_id,
      ip,
      method,
      endpoint,
      original_url,
      decision,
      severity,
      reason,
      status_code,
      duration_ms,
      queue_wait_ms,
      is_error,
      context_json,
      result_json
    )
    VALUES (
      @timestamp,
      @request_id,
      @ip,
      @method,
      @endpoint,
      @original_url,
      @decision,
      @severity,
      @reason,
      @status_code,
      @duration_ms,
      @queue_wait_ms,
      @is_error,
      @context_json,
      @result_json
    )
  `).run(row);
}

function mapRequestRow(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    requestId: row.request_id,
    ip: row.ip,
    method: row.method,
    endpoint: row.endpoint,
    originalUrl: row.original_url,
    decision: row.decision,
    severity: row.severity,
    reason: row.reason,
    statusCode: row.status_code,
    durationMs: row.duration_ms,
    queueWaitMs: row.queue_wait_ms,
    isError: Boolean(row.is_error),
    context: parseJson(row.context_json, {}),
    result: parseJson(row.result_json, {})
  };
}

function getRecentRequestLogs(limit = 50) {
  const db = getDb();

  return db.prepare(`
    SELECT *
    FROM request_logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit).map(mapRequestRow);
}

module.exports = {
  writeRequestLog,
  getRecentRequestLogs
};
