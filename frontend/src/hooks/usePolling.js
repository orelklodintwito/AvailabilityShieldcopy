import { useEffect, useRef } from "react";

export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => callbackRef.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
}
