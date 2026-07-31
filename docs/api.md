# API

All dashboard reads are gateway routes under `/__shield`. Use `limit` on event, request and snapshot routes (1-200). `GET /__shield/target` returns the active target and database mode; `GET /__shield/target/check` checks its public URL. `PUT /__shield/target` changes the target and requires the `x-availabilityshield-admin-token` header when `SHIELD_ADMIN_TOKEN` is configured. The URL must be public `http://` or `https://` in production.

Traffic sent to any non-`/__shield` path is reverse-proxied to the active target after Layer 7 mitigation. The generic policy protects unknown paths with a default rate limit, while configured heavy endpoints additionally use delay and bounded queue decisions. Simulation routes are development-only by default. Start accepts only `normal`, `http-flood`, `heavy`, `mitigation-demo`, and `basic-preservation`, with bounded `requests` and `concurrency`. The `mitigation-demo` preset targets `/api/export` to make policy events visible in Alerts, Mitigation and Queue.

The Render deployment enables a controlled exception for the simulation routes:
they require `x-availabilityshield-admin-token`, force `mode=with-shield`, run
only when the included Protected App is active, and cap the run at 24 requests
with four workers. They return an error when an external target is selected.

## Windows Layer 4 agent ingestion

The following routes accept only an `Authorization: Bearer <LAYER4_AGENT_TOKEN>`
header. Configure the token on the Gateway and keep it out of the dashboard.

- `POST /__shield/layer4/heartbeat` — upserts the agent's running state and
  latest counters.
- `POST /__shield/layer4/metrics` — upserts the latest metrics snapshot.
- `POST /__shield/layer4/events` — stores up to 100 queued agent events per
  request.

Heartbeat and metrics payloads contain `agentId`, `running`, `mode`, `stats`
and `timestamp`. The Gateway validates the agent ID, clamps counters and
rejects unauthenticated or malformed payloads before MongoDB persistence.
Dashboard reads use the existing `GET /__shield/layer4/health`,
`GET /__shield/layer4/metrics` and `GET /__shield/layer4/events` routes. A
snapshot is marked stale after `LAYER4_AGENT_STALE_MS` (15 seconds by default).
