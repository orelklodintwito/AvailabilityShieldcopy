const { getDb, safeJson, parseJson } = require("../db/database");

function nowIso() {
  return new Date().toISOString();
}

function writeSecurityEvent(context = {}) {
  const db = getDb();

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

  db.prepare(`
    INSERT INTO security_events (
      timestamp,
      request_id,
      ip,
      method,
      endpoint,
      decision,
      severity,
      reason,
      queue_wait_ms,
      event_json
    )
    VALUES (
      @timestamp,
      @request_id,
      @ip,
      @method,
      @endpoint,
      @decision,
      @severity,
      @reason,
      @queue_wait_ms,
      @event_json
    )
  `).run({
    timestamp: event.timestamp,
    request_id: event.requestId,
    ip: event.ip,
    method: event.method,
    endpoint: event.endpoint,
    decision: event.decision,
    severity: event.severity,
    reason: event.reason,
    queue_wait_ms: event.queueWaitMs,
    event_json: safeJson(event)
  });
}

function mapSecurityEventRow(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    requestId: row.request_id,
    ip: row.ip,
    method: row.method,
    endpoint: row.endpoint,
    decision: row.decision,
    severity: row.severity,
    reason: row.reason,
    queueWaitMs: row.queue_wait_ms,
    event: parseJson(row.event_json, {})
  };
}

function getRecentSecurityEvents(limit = 50) {
  const db = getDb();

  return db.prepare(`
    SELECT *
    FROM security_events
    ORDER BY id DESC
    LIMIT ?
  `).all(limit).map(mapSecurityEventRow);
}

module.exports = {
  writeSecurityEvent,
  getRecentSecurityEvents
};
