import { useCallback, useState } from "react";
import { shieldApi } from "../services/api.js";

export function useLayer4() {
  const [state, setState] = useState({ metrics: null, events: [], loading: true, error: "" });
  const refresh = useCallback(async () => {
    try { const [metrics, events] = await Promise.all([shieldApi.layer4Metrics(), shieldApi.layer4Events()]); setState({ metrics, events: events.events || [], loading: false, error: "" }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  return { ...state, refresh };
}
