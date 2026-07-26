import { useCallback, useState } from "react";
import { shieldApi } from "../services/api.js";

export function useShieldOverview() {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try { setState({ data: await shieldApi.overview(), loading: false, error: "" }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  return { ...state, refresh };
}
