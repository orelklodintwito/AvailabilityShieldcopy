# Architecture

The gateway is the single frontend data boundary. Requests receive a context and policy classification, pass through metrics and mitigation, wait in the bounded heavy-request queue when required, and are then proxied to the protected app. SQLite stores request, event and metric records. Layer 4 writes its own metrics/events files and is read through gateway adapters.
