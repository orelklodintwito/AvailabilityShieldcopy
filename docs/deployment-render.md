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
4. Create a free MongoDB Atlas cluster and copy its SRV connection string. In the
   Gateway service, set `MONGODB_URI`, `MONGODB_DB_NAME=availabilityshield`, and a
   long random `SHIELD_ADMIN_TOKEN`.
   In Atlas Network Access, allow the Render service to connect (for a classroom
   demo this is commonly `0.0.0.0/0`, protected by the database username/password).
5. In the Gateway service, set `FRONTEND_ORIGIN` to the final dashboard URL, for example:
   `https://availabilityshield-dashboard.onrender.com`.
6. Confirm the generated `PROTECTED_APP_AUTH_TOKEN` is present on the Gateway and
   is automatically copied to the Protected App by the Blueprint.
7. In the dashboard service, set `VITE_API_BASE_URL` to the Gateway URL, for example:
   `https://availabilityshield-api.onrender.com`.
8. Redeploy the Gateway and dashboard after saving the values.

The Gateway health check is `/__shield/health`. Render supplies the public `PORT`;
both cloud Node services listen on `0.0.0.0`. The Protected App's application
routes reject direct requests without the Gateway token.

## Free-tier limitations

Render Free services can sleep after inactivity. MongoDB Atlas is the persistent
store for Gateway logs and target configuration, so those records survive a Render
restart. Render Free cannot create a private service, so the included Protected App
is a free web service with Gateway-token protection; the Gateway can also proxy to
any public target entered in Settings. The Windows PyDivert Layer 4 guard is not
part of the Render deployment.

Production-only reset and simulation endpoints are disabled by `NODE_ENV=production`.
Traffic simulations remain local-only.

## Cloud smoke test

After both services deploy, verify:

```text
GET https://<api-host>/__shield/health
GET https://<api-host>/__shield/metrics
GET https://<api-host>/api/basic
GET https://<api-host>/__shield/target
```

Then open the dashboard URL and confirm that Health, Metrics, Queue, Events and
Reports load without `localhost` requests or CORS errors. In Settings, enter a
public test site, click **Check target**, then send a request through the Gateway
path and verify the target response and `x-availabilityshield-*` headers.

To test a lecturer-supplied site, save its public URL in **Settings** and then
open the same path through the Gateway host (for example,
`https://<api-host>/products` rather than the target host directly). The target
does not need to run AvailabilityShield. Check **Traffic Monitor** and
**Reports** for the resulting request and decision.

## Local Layer 4 demo

On Windows, install `layer4/requirements.txt`, open Administrator PowerShell and
run `npm run dev:layer4` in monitor mode. This protects and reports traffic on the
Windows machine; it does not protect the Render service.
