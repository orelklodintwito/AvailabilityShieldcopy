CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  request_id TEXT,
  ip TEXT,
  method TEXT,
  endpoint TEXT,
  original_url TEXT,
  decision TEXT,
  severity TEXT,
  reason TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  queue_wait_ms INTEGER,
  is_error INTEGER DEFAULT 0,
  context_json TEXT,
  result_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_request_logs_decision ON request_logs(decision);
CREATE INDEX IF NOT EXISTS idx_request_logs_severity ON request_logs(severity);

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  request_id TEXT,
  ip TEXT,
  method TEXT,
  endpoint TEXT,
  decision TEXT,
  severity TEXT,
  reason TEXT,
  queue_wait_ms INTEGER,
  event_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_endpoint ON security_events(endpoint);
CREATE INDEX IF NOT EXISTS idx_security_events_decision ON security_events(decision);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  total_requests INTEGER,
  active_requests INTEGER,
  total_errors INTEGER,
  error_rate REAL,
  snapshot_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_timestamp ON metric_snapshots(timestamp);
