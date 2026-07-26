import { useCallback, useState } from "react";
import { shieldApi } from "../services/api.js";

export function useEvents(limit = 50) {
  const [state, setState] = useState({ data: [], loading: true, error: "" });
  const refresh = useCallback(async () => {
    try { const response = await shieldApi.events(limit); setState({ data: response.events || [], loading: false, error: "" }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [limit]);
  return { ...state, refresh };
}
