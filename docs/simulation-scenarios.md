# Simulation scenarios

The development-only Simulation Manager accepts `normal`, `http-flood`, `heavy` and `basic-preservation`. It caps requests at 200 and concurrency at 10, permits one run at a time, reports progress/results, supports cancellation, and chooses either the gateway or direct protected-app target. No shell command is accepted from the client.
