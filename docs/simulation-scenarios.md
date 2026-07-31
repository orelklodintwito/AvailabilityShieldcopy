# Simulation scenarios

The Simulation Manager accepts `normal`, `http-flood`, `heavy`, `mitigation-demo` and `basic-preservation`. `mitigation-demo` intentionally repeats the bounded heavy `/api/export` endpoint so the dashboard's Alerts, Mitigation and Queue views visibly demonstrate policy decisions. It caps requests at 200 locally (24 in cloud mode) and concurrency at 10 locally (4 in cloud mode), permits one run at a time, reports progress/results, supports cancellation, and chooses the gateway target. No shell command is accepted from the client.
