# AvailabilityShield user guide

## What the system does

AvailabilityShield is a reverse-proxy protection layer. A client sends a
request to the Gateway, the Gateway classifies the traffic and applies the
Layer 7 policy, and allowed traffic is forwarded to the active public target.
Request decisions, security events, metrics and the active target are stored
in MongoDB. The React dashboard reads those records through the Gateway API.

The optional Layer 4 component is a Windows-only PyDivert/WinDivert agent. It
observes TCP SYN traffic before the local Gateway and can allow or drop bursts.
It is not executed inside Render because Render runs Linux containers.

For cloud telemetry, set `LAYER4_AGENT_TOKEN` on the Render Gateway and set the
same value on the Windows agent together with
`LAYER4_GATEWAY_URL=https://availabilityshield-api.onrender.com`. The agent
publishes heartbeat, metrics and events over HTTPS every five seconds. The
Layer 4 dashboard page then shows the Windows agent's latest counters and marks
them stale if heartbeats stop. This reports the local agent; it does not make
PyDivert protect every connection reaching Render.

## Cloud access

- Dashboard: `https://availabilityshield-dashboard.onrender.com/`
- Gateway/API: `https://availabilityshield-api.onrender.com/`
- Health: `https://availabilityshield-api.onrender.com/__shield/health`

Render hosts the dashboard, Gateway and included Protected App as separate
services. MongoDB Atlas is the persistent store. Render Free can sleep while
idle, so the first request after inactivity may take longer.

## Local access

From the repository root, install dependencies with `npm run install:all`.
Run `npm run dev:all` from Administrator PowerShell for the full demo, or run
`npm run dev:app`, `npm run dev:gateway` and `npm run dev:frontend` separately
when only Layer 7 is needed. The local dashboard is
`http://localhost:5173`; requests go through `http://localhost:4000`.

## Protecting another public site

1. Open the dashboard's **Settings** view.
2. Enter a public `http://` or `https://` target URL.
3. Enter the `SHIELD_ADMIN_TOKEN` configured for the Gateway.
4. Select **Check target**, then **Save target**.
5. Open the Gateway URL with the desired path. Do not browse the target URL
   directly if you want to test AvailabilityShield.
6. Inspect **Traffic Monitor**, **Mitigation**, **Alerts**, **Queue** and
   **Reports** for the resulting decisions.

The Gateway forwards the original method, path and request body and adds
AvailabilityShield decision headers. The target must be reachable from the
cloud server. Production blocks localhost, private IP ranges and unsupported
URL schemes to avoid turning the Gateway into an SSRF relay.

## Dashboard map

| View | Purpose |
| --- | --- |
| Dashboard | Overall health and current protection status |
| Alerts | Warnings, high-severity and critical security events |
| Traffic Monitor | Request logs, status codes, latency and decisions |
| Mitigation | Allow/delay/queue/drop activity |
| Policies | Layer 7 limits and endpoint policy |
| Queue | Heavy-request queue depth and wait accounting |
| Layer 4 | Windows PyDivert health, SYN metrics and blocked sources; optionally synchronized to the cloud |
| Reports | JSON/CSV/PDF exports |
| Simulator | Bounded demo traffic; cloud mode is internal-target-only and token-protected |
| Settings | Active protected target and target reachability check |
| System Health | Gateway, database and target health |

The simulator creates small allow-listed bursts. Locally it targets the local
Gateway. In the Render deployment, open **Simulator**, read the safety notice
shown above the controls, enter the configured `SHIELD_ADMIN_TOKEN`, choose a
scenario and click **Run demo**. Cloud mode is limited to the included
Protected App (maximum 24 requests and four workers) and is rejected when an
external target is active. It cannot execute shell commands or generate
traffic against a lecturer's external site. The run is owned by the Gateway
and is global to the dashboard. Changing sections, opening another dashboard
tab or refreshing the browser does not cancel it. All dashboard views keep
polling live metrics while the run is active, and the global banner or
**Simulator** page can cancel it. A service restart ends an in-memory run.

## Submission smoke test

Verify that the following return a healthy response before demonstrating:

```text
GET /__shield/health
GET /__shield/metrics
GET /__shield/target
GET /api/basic
```

Then change the target to the lecturer's public site, send one request through
the Gateway, and show the matching entry in Traffic Monitor and MongoDB-backed
logs. Run `npm run validate:all` locally with the app and Gateway running.
