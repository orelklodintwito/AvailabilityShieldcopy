# Architecture

The gateway is the single frontend data boundary. Requests receive a context and policy classification, pass through metrics and mitigation, wait in the bounded heavy-request queue when required, and are then proxied to the active target. The target may be the included protected app or a lecturer-supplied public HTTP/HTTPS site. MongoDB stores request, event, metric and active-target records. Layer 4 writes its own metrics/events files and is read through gateway adapters.

## Request flow

1. A client sends traffic to the public Gateway URL.
2. The local Windows PyDivert agent can inspect TCP SYN traffic before the Gateway when the lab is run on Windows.
3. The Gateway classifies Layer 7 traffic and applies rate limit, delay, queue or drop.
4. Allowed traffic is reverse-proxied to the configured target site.
5. MongoDB receives the request, security-event and metric records for the dashboard.

The target can be changed from **Settings** with the production `SHIELD_ADMIN_TOKEN`. Private or localhost targets are blocked in production to prevent the Gateway from becoming an SSRF relay.
