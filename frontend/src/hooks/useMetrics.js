import { useCallback, useState } from "react";
import { shieldApi } from "../services/api.js";

export function useMetrics() {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const refresh = useCallback(async () => {
    try { setState({ data: await shieldApi.metrics(), loading: false, error: "" }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  return { ...state, refresh };
}
