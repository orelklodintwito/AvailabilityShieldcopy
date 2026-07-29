# API

All dashboard reads are gateway routes under `/__shield`. Use `limit` on event, request and snapshot routes (1-200). `GET /__shield/target` returns the active target and database mode; `GET /__shield/target/check` checks its public URL. `PUT /__shield/target` changes the target and requires the `x-availabilityshield-admin-token` header when `SHIELD_ADMIN_TOKEN` is configured. The URL must be public `http://` or `https://` in production.

Traffic sent to any non-`/__shield` path is reverse-proxied to the active target after Layer 7 mitigation. The generic policy protects unknown paths with a default rate limit, while configured heavy endpoints additionally use delay and bounded queue decisions. Simulation routes are available only when `NODE_ENV` is not production. Start accepts only `normal`, `http-flood`, `heavy`, and `basic-preservation`, with bounded `requests` and `concurrency`.
