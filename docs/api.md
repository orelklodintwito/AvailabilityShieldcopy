# API

All dashboard reads are gateway routes under `/__shield`. Use `limit` on event, request and snapshot routes (1–200). Simulation routes are available only when `NODE_ENV` is not production. Start accepts only `normal`, `http-flood`, `heavy`, and `basic-preservation`, with bounded `requests` and `concurrency`.
