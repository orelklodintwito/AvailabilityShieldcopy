# AvailabilityShield

AvailabilityShield is a local IPS-style availability protection lab. It combines a protected HTTP application, a Layer 7 gateway with policy-driven mitigation and queueing, optional Layer 4 SYN protection, SQLite-backed logs, a React dashboard, and bounded simulations.

## Run

Requirements: Node.js 18+, npm, and (for Layer 4) Python 3, PyDivert and Administrator privileges on Windows.

```bash
npm run install:all
npm run dev:all
```

The protected app is on `http://localhost:3000`, gateway/API on `http://localhost:4000`, and Vite frontend on `http://localhost:5173`.

If Layer 4 dependencies are unavailable, run the app, gateway and frontend separately with `npm run dev:app`, `npm run dev:gateway`, and `npm run dev:frontend`.

## Validation

With the protected app and gateway running: `npm run build`, `npm run validate:backend`, and `npm run validate:all`.

The simulator is local-only, uses an allow-listed scenario set, caps request count and concurrency, and never executes a client-provided shell command.

See [docs/architecture.md](docs/architecture.md), [docs/api.md](docs/api.md), [docs/testing.md](docs/testing.md), and [docs/demo-plan.md](docs/demo-plan.md).
