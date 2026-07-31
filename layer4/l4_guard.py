import argparse
import json
import os
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from datetime import datetime, timezone
from ipaddress import ip_address
from pathlib import Path

try:
    import pydivert
except ImportError:
    print("Missing dependency: pydivert")
    print("Install with: py -3 -m pip install pydivert")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = PROJECT_ROOT / "layer4" / "l4-policy.json"
LOG_DIR = Path(os.environ.get("AVAILABILITYSHIELD_LOG_DIR", PROJECT_ROOT / "logs" / "layer4"))
EVENT_LOG_PATH = LOG_DIR / "layer4-events.jsonl"
METRICS_PATH = LOG_DIR / "layer4-metrics.json"
DEFAULT_SYNC_INTERVAL_SECONDS = 5.0

running = True
syn_windows = defaultdict(deque)
pending_events = deque(maxlen=500)
pending_events_lock = threading.Lock()

stats = {
    "startedAt": None,
    "mode": "monitor",
    "filter": "",
    "totalPacketsSeen": 0,
    "totalTcpSynSeen": 0,
    "totalAllowed": 0,
    "totalDropped": 0,
    "totalWarnings": 0,
    "totalHigh": 0,
    "bySource": {},
    "byPort": {},
    "lastEvent": None
}


def now_ms():
    return int(time.time() * 1000)


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class CloudSync:
    def __init__(self, gateway_url, token, agent_id, mode, interval_seconds):
        self.gateway_url = gateway_url.rstrip("/")
        self.token = token
        self.agent_id = agent_id
        self.mode = mode
        self.interval_seconds = max(float(interval_seconds), 1.0)
        self.stop_event = threading.Event()
        self.thread = None
        self.last_error = None

    @property
    def enabled(self):
        return bool(self.gateway_url and self.token)

    def start(self):
        if not self.enabled:
            print("Cloud Layer 4 sync disabled: set LAYER4_GATEWAY_URL and LAYER4_AGENT_TOKEN to enable.")
            return

        self.thread = threading.Thread(target=self._loop, name="layer4-cloud-sync", daemon=True)
        self.thread.start()
        print(f"Cloud Layer 4 sync enabled: {self.gateway_url} (every {self.interval_seconds:g}s)")

    def stop(self):
        if not self.enabled:
            return

        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=max(self.interval_seconds + 1, 3))
        self.send_snapshot(False)
        self.send_pending_events()

    def _loop(self):
        while not self.stop_event.is_set():
            self.send_snapshot(True)
            self.send_pending_events()
            self.stop_event.wait(self.interval_seconds)

    def _post(self, endpoint, payload):
        url = f"{self.gateway_url}/__shield/layer4/{endpoint}"
        request = urllib.request.Request(
            url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "AvailabilityShield-Layer4-Agent/1.0"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(request, timeout=4) as response:
                if response.status < 200 or response.status >= 300:
                    raise RuntimeError(f"HTTP {response.status}")
            self.last_error = None
            return True
        except (urllib.error.URLError, TimeoutError, RuntimeError, OSError) as error:
            message = str(error)
            if message != self.last_error:
                print(f"Cloud Layer 4 sync warning: {message}")
                self.last_error = message
            return False

    def _snapshot_stats(self):
        # JSON round-tripping gives the sender an isolated copy while packet
        # handling continues to update the live counters.
        return json.loads(json.dumps(stats, ensure_ascii=False))

    def send_snapshot(self, is_running):
        payload = {
            "agentId": self.agent_id,
            "running": bool(is_running),
            "mode": self.mode,
            "stats": self._snapshot_stats(),
            "timestamp": now_iso()
        }
        self._post("heartbeat", payload)
        self._post("metrics", payload)

    def send_pending_events(self):
        with pending_events_lock:
            if not pending_events:
                return
            events = list(pending_events)
            pending_events.clear()

        if not self._post("events", {"agentId": self.agent_id, "events": events}):
            with pending_events_lock:
                for event in reversed(events):
                    pending_events.appendleft(event)


def load_policy():
    if not POLICY_PATH.exists():
        raise FileNotFoundError(f"Missing Layer 4 policy: {POLICY_PATH}")

    with POLICY_PATH.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def is_loopback_address(value):
    try:
        return ip_address(value).is_loopback
    except Exception:
        return False


def ensure_dirs():
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def append_jsonl(path, data):
    ensure_dirs()

    with path.open("a", encoding="utf8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")


def write_metrics(policy):
    ensure_dirs()

    payload = {
        "type": "layer4_metrics",
        "policy": policy,
        "stats": stats,
        "timestamp": now_iso()
    }

    with METRICS_PATH.open("w", encoding="utf8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def log_event(event):
    stats["lastEvent"] = event
    append_jsonl(EVENT_LOG_PATH, event)
    with pending_events_lock:
        pending_events.append(event)


def get_tcp_flag(tcp, name):
    return bool(getattr(tcp, name, False) or getattr(tcp, name.upper(), False) or getattr(tcp, name.capitalize(), False))


def get_packet_port(packet, name):
    value = getattr(packet, name, None)

    if value is not None:
        return value

    tcp = getattr(packet, "tcp", None)

    if tcp is None:
        return None

    if name == "dst_port":
        return getattr(tcp, "dst_port", None) or getattr(tcp, "dstport", None)

    if name == "src_port":
        return getattr(tcp, "src_port", None) or getattr(tcp, "srcport", None)

    return None


def prune_window(items, current_ms, window_ms):
    while items and current_ms - items[0] > window_ms:
        items.popleft()


def increment_map_counter(map_name, key, field):
    if key not in stats[map_name]:
        stats[map_name][key] = {
            "totalSyn": 0,
            "allowed": 0,
            "dropped": 0,
            "warnings": 0,
            "high": 0
        }

    stats[map_name][key][field] += 1


def classify_syn_count(count, policy):
    warning = int(policy.get("warningSynPerWindow", 10))
    drop = int(policy.get("dropSynPerWindow", 20))

    if count > drop:
        return "critical"

    if count > warning:
        return "high"

    if count == warning:
        return "warning"

    return "normal"


def should_drop(severity, mode, policy):
    if mode != "enforce":
        return False

    if severity != "critical":
        return False

    max_drops = int(policy.get("maxDropsPerRun", 200))

    return stats["totalDropped"] < max_drops


def build_filter(policy):
    ports = policy.get("protectedPorts", [4000])

    port_filter = " or ".join([f"tcp.DstPort == {int(port)}" for port in ports])

    return f"tcp and ({port_filter})"


def handle_signal(sig, frame):
    global running
    running = False
    print("\nStopping Layer 4 guard...")


def main():
    parser = argparse.ArgumentParser(description="AvailabilityShield Layer 4 TCP/SYN guard")
    parser.add_argument("--mode", choices=["monitor", "enforce"], default="monitor")
    parser.add_argument("--gateway-url", default=os.environ.get("LAYER4_GATEWAY_URL", ""))
    parser.add_argument("--agent-id", default=os.environ.get("LAYER4_AGENT_ID", "orel-windows"))
    parser.add_argument(
        "--sync-interval",
        type=float,
        default=float(os.environ.get("LAYER4_SYNC_INTERVAL_SECONDS", DEFAULT_SYNC_INTERVAL_SECONDS))
    )
    args = parser.parse_args()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    policy = load_policy()

    if not policy.get("enabled", True):
        print("Layer 4 policy is disabled.")
        return

    filter_expression = build_filter(policy)

    stats["startedAt"] = now_iso()
    stats["mode"] = args.mode
    stats["filter"] = filter_expression

    print("AvailabilityShield Layer 4 Guard")
    print(f"Mode: {args.mode}")
    print(f"Filter: {filter_expression}")
    print("Important: run this PowerShell window as Administrator.")
    print("Press CTRL+C to stop.\n")

    write_metrics(policy)
    cloud_sync = CloudSync(
        args.gateway_url,
        os.environ.get("LAYER4_AGENT_TOKEN", ""),
        args.agent_id,
        args.mode,
        args.sync_interval
    )
    cloud_sync.start()

    try:
        with pydivert.WinDivert(filter_expression) as divert:
            packet_index = 0

            for packet in divert:
                if not running:
                    try:
                        divert.send(packet)
                    except Exception:
                        pass
                    break

                packet_index += 1
                stats["totalPacketsSeen"] += 1

                tcp = getattr(packet, "tcp", None)

                if tcp is None:
                    divert.send(packet)
                    continue

                syn = get_tcp_flag(tcp, "syn")
                ack = get_tcp_flag(tcp, "ack")

                src_addr = str(getattr(packet, "src_addr", "unknown"))
                dst_addr = str(getattr(packet, "dst_addr", "unknown"))
                src_port = get_packet_port(packet, "src_port")
                dst_port = get_packet_port(packet, "dst_port")

                local_only = bool(policy.get("localOnly", True))

                if local_only and not (is_loopback_address(src_addr) or is_loopback_address(dst_addr)):
                    divert.send(packet)
                    continue

                if not syn or ack:
                    divert.send(packet)
                    continue

                current = now_ms()
                window_ms = int(policy.get("windowMs", 10000))

                key = f"{src_addr}->{dst_addr}:{dst_port}"
                items = syn_windows[key]
                prune_window(items, current, window_ms)
                items.append(current)

                count = len(items)
                severity = classify_syn_count(count, policy)

                stats["totalTcpSynSeen"] += 1
                increment_map_counter("bySource", src_addr, "totalSyn")
                increment_map_counter("byPort", str(dst_port), "totalSyn")

                drop = should_drop(severity, args.mode, policy)

                event = {
                    "type": "layer4_syn_decision",
                    "mode": args.mode,
                    "srcAddr": src_addr,
                    "srcPort": src_port,
                    "dstAddr": dst_addr,
                    "dstPort": dst_port,
                    "synCountInWindow": count,
                    "windowMs": window_ms,
                    "severity": severity,
                    "decision": "drop" if drop else "allow",
                    "timestamp": now_iso()
                }

                if severity == "warning":
                    stats["totalWarnings"] += 1
                    increment_map_counter("bySource", src_addr, "warnings")
                    increment_map_counter("byPort", str(dst_port), "warnings")
                    log_event(event)

                if severity in ["high", "critical"]:
                    stats["totalHigh"] += 1
                    increment_map_counter("bySource", src_addr, "high")
                    increment_map_counter("byPort", str(dst_port), "high")
                    log_event(event)

                if drop:
                    stats["totalDropped"] += 1
                    increment_map_counter("bySource", src_addr, "dropped")
                    increment_map_counter("byPort", str(dst_port), "dropped")
                    print(
                        f"DROP SYN src={src_addr}:{src_port} dst={dst_addr}:{dst_port} "
                        f"count={count}/{policy.get('dropSynPerWindow')} severity={severity}"
                    )
                    write_metrics(policy)
                    continue

                stats["totalAllowed"] += 1
                increment_map_counter("bySource", src_addr, "allowed")
                increment_map_counter("byPort", str(dst_port), "allowed")

                if packet_index % int(policy.get("metricsWriteEveryPackets", 5)) == 0:
                    write_metrics(policy)

                divert.send(packet)

    except PermissionError:
        print("Permission error. Run PowerShell as Administrator.")
        sys.exit(1)
    except OSError as error:
        print("Layer 4 guard failed.")
        print(error)
        print("Make sure PowerShell is running as Administrator and PyDivert/WinDivert can load.")
        sys.exit(1)
    finally:
        cloud_sync.stop()
        write_metrics(policy)
        print("Layer 4 guard stopped.")
        print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
