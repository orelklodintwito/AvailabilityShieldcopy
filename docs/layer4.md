# Layer 4

`layer4/l4_guard.py` observes TCP SYN traffic through PyDivert/WinDivert. Local-only policy, warning/drop windows, source and port counters, JSON metrics and JSONL events are written under `logs/layer4/`. The Gateway exposes health, metrics, connections, blocked sources and events without exposing the file system to the browser.
