# AvailabilityShield

AvailabilityShield is a Layer 7 reverse-proxy protection system with an optional local Windows Layer 4 SYN guard. The Gateway can protect the included demo app or any public HTTP/HTTPS site supplied by the lecturer, applying rate limit, delay, queue and drop decisions before forwarding traffic. MongoDB stores request logs, security events and metric snapshots; a React dashboard displays the decisions.

## Live demo

- [Open the AvailabilityShield Dashboard](https://availabilityshield-dashboard.onrender.com/)
- [API health check](https://availabilityshield-api.onrender.com/__shield/health)

The free Render deployment runs the Layer 7 gateway, protected app and React dashboard. The PyDivert Layer 4 guard remains a local Windows component. Configure a MongoDB Atlas free cluster in Render with `MONGODB_URI` before using the deployment as a persistent demo.

## Run

Requirements: Node.js 18+, npm, and (for Layer 4) Python 3, PyDivert and Administrator privileges on Windows.

Install the optional Layer 4 dependency with `py -3 -m pip install -r layer4/requirements.txt`, then run the terminal as Administrator.

```bash
npm run install:all
npm run dev:all
```

The protected app is on `http://localhost:3000`, gateway/API on `http://localhost:4000`, and Vite frontend on `http://localhost:5173`. In the dashboard's Settings page, enter the lecturer's public `http://` or `https://` target and the configured `SHIELD_ADMIN_TOKEN`; all subsequent traffic through the Gateway is proxied to that site.

If Layer 4 dependencies are unavailable, run the app, gateway and frontend separately with `npm run dev:app`, `npm run dev:gateway`, and `npm run dev:frontend`.

## Validation

With the protected app and gateway running: `npm run build`, `npm run lint`, `npm test`, and `npm run validate:all`.

`validate:all` runs frontend structure/unit checks, ESLint, production build, Layer 4 policy checks, and the live backend scenarios. The live backend portion requires the app and gateway; Layer 4 packet enforcement additionally requires PyDivert and Administrator privileges.

The simulator is local-only, uses an allow-listed scenario set, caps request count and concurrency, and never executes a client-provided shell command.

See [docs/architecture.md](docs/architecture.md), [docs/api.md](docs/api.md), [docs/testing.md](docs/testing.md), and [docs/demo-plan.md](docs/demo-plan.md).

## Completion checklist

The repository now includes clean environment handling, one-command startup, a gateway API contract, Vite proxying, page-level React structure, real metrics/queues/events, Layer 4 routes, a safe browser simulator, JSON/CSV/PDF reports, loading/error/disconnected states, ESLint/Vitest coverage, edge-case validation, and the documented demo flow.

## Render free Layer 7 deployment

Render can host the React dashboard, Gateway and Protected App for a free demo.
Apply `render.yaml` and follow [docs/deployment-render.md](docs/deployment-render.md).
The PyDivert Layer 4 guard remains a local Windows component because it requires
WinDivert and Administrator privileges. MongoDB Atlas provides the persistent data
store; never commit its connection string or the dashboard admin token.
