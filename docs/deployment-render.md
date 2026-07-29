# Render deployment (free Layer 7 demo)

This deployment publishes the React dashboard, the Node Gateway and the protected
web application on Render. The Windows PyDivert Layer 4 guard remains a local
Windows component because WinDivert requires Windows and Administrator privileges.

## Deploy from the Blueprint

1. Open Render and choose **New -> Blueprint**.
2. Connect `orelklodintwito/AvailabilityShieldcopy` and select the `main` branch.
3. Apply `render.yaml`.
4. In the API service, set `FRONTEND_ORIGIN` to the final dashboard URL, for example:
   `https://availabilityshield-dashboard.onrender.com`.
5. In the dashboard service, set `VITE_API_BASE_URL` to the API URL, for example:
   `https://availabilityshield-api.onrender.com`.
6. Redeploy the dashboard after saving the API URL.

The API health check is `/__shield/health`. Render supplies the public `PORT`; the
Gateway listens on `0.0.0.0` and the Protected App remains bound to `127.0.0.1`.

## Free-tier limitations

Render Free services can sleep after inactivity and their local filesystem is
ephemeral. The demo therefore uses `/tmp` for SQLite and Layer 4 log snapshots;
runtime data can reset after a restart, redeploy or cold start. Persistent SQLite
requires a paid persistent disk or a database migration.

Production-only reset and simulation endpoints are disabled by `NODE_ENV=production`.
Traffic simulations remain local-only.

## Cloud smoke test

After both services deploy, verify:

```text
GET https://<api-host>/__shield/health
GET https://<api-host>/__shield/metrics
GET https://<api-host>/api/basic
```

Then open the dashboard URL and confirm that Health, Metrics, Queue, Events and
Reports load without `localhost` requests or CORS errors. Wait for a free-service
cold start once and repeat the health check.

## Local Layer 4 demo

On Windows, install `layer4/requirements.txt`, open Administrator PowerShell and
run `npm run dev:layer4` in monitor mode. This protects and reports traffic on the
Windows machine; it does not protect the Render service.
