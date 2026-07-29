import { useCallback, useEffect, useRef, useState } from "react";
import { shieldApi } from "../services/api.js";

const emptyData = { health: null, overview: null, metrics: null, events: [], logs: [], policy: null, target: null, snapshots: [], layer4: null };

export function useShieldDashboard(intervalMs = 5000) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);
  const activeRequest = useRef(null);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    activeRequest.current?.abort();
    activeRequest.current = new AbortController();
    const requestOptions = { signal: activeRequest.current.signal, retry: 1 };
    try {
      const [health, overview, metrics, events, logs, policy, target, snapshots, layer4] = await Promise.all([
        shieldApi.health(requestOptions), shieldApi.overview(requestOptions), shieldApi.metrics(requestOptions), shieldApi.events(50, requestOptions),
        shieldApi.requests(50, requestOptions), shieldApi.policy(requestOptions), shieldApi.target(requestOptions), shieldApi.snapshots(24, requestOptions), shieldApi.layer4Metrics(requestOptions)
      ]);
      if (!mounted.current) return;
      setData({ health, overview, metrics, events: events.events || [], logs: logs.logs || [], policy, target, snapshots: snapshots.snapshots || [], layer4 });
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      if (mounted.current) setError(err.message || "Could not connect to the gateway");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadDashboard();
    const timer = window.setInterval(() => loadDashboard(true), intervalMs);
    return () => { mounted.current = false; activeRequest.current?.abort(); window.clearInterval(timer); };
  }, [intervalMs, loadDashboard]);

  const reset = useCallback(async () => {
    try { await shieldApi.reset(); await loadDashboard(); }
    catch (err) { setError(err.message || "Could not reset gateway metrics"); }
  }, [loadDashboard]);

  return { data, loading, error, lastUpdated, loadDashboard, reset, disconnected: Boolean(error) };
}
