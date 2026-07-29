# Render deployment (free Layer 7 demo)

This deployment publishes three cloud services on Render: a public React
dashboard, a public Layer 7 Gateway, and a separately deployed Protected App.
The Protected App accepts application traffic only when the Gateway supplies the
shared internal token. The Windows PyDivert Layer 4 guard remains local because
WinDivert requires Windows and Administrator privileges.

## Deploy from the Blueprint

1. Open Render and choose **New -> Blueprint**.
2. Connect `orelklodintwito/AvailabilityShieldcopy` and select the `main` branch.
3. Apply `render.yaml`.
4. In the Gateway service, set `FRONTEND_ORIGIN` to the final dashboard URL, for example:
   `https://availabilityshield-dashboard.onrender.com`.
5. Confirm the generated `PROTECTED_APP_AUTH_TOKEN` is present on the Gateway and
   is automatically copied to the Protected App by the Blueprint.
6. In the dashboard service, set `VITE_API_BASE_URL` to the Gateway URL, for example:
   `https://availabilityshield-api.onrender.com`.
7. Redeploy the Gateway and dashboard after saving the values.

The Gateway health check is `/__shield/health`. Render supplies the public `PORT`;
both cloud Node services listen on `0.0.0.0`. The Protected App's application
routes reject direct requests without the Gateway token.

## Free-tier limitations

Render Free services can sleep after inactivity and their local filesystem is
ephemeral. The demo therefore uses `/tmp` for SQLite and runtime logs; data can
reset after a restart, redeploy or cold start. Persistent SQLite requires a paid
persistent disk or a database migration. Render Free cannot create a private
service, so the Protected App is a free web service with Gateway-token protection;
a truly non-public Protected App requires a paid private service.

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
