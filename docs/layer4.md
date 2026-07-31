# Layer 4

`layer4/l4_guard.py` observes TCP SYN traffic through PyDivert/WinDivert. The
local-only policy, warning/drop windows, source and port counters, JSON metrics
and JSONL events are written under `logs/layer4/`.

When `LAYER4_GATEWAY_URL` and `LAYER4_AGENT_TOKEN` are configured, the same
agent also publishes a heartbeat and metrics every five seconds and forwards
queued events over HTTPS. The Gateway accepts only a matching
`Authorization: Bearer <token>` header and stores the latest agent snapshot
and events in MongoDB. The dashboard reads that cloud snapshot through the
Gateway and marks it stale when no heartbeat has arrived for 15 seconds.

The cloud channel reports the Windows agent; it does not move PyDivert into
Render or protect all traffic arriving at Render. Packet interception remains
limited to traffic crossing the Windows machine running WinDivert.

The Gateway exposes health, metrics, connections, blocked sources and events
without exposing the file system to the browser. Agent ingestion endpoints are
`POST /__shield/layer4/heartbeat`, `POST /__shield/layer4/metrics` and
`POST /__shield/layer4/events`.
