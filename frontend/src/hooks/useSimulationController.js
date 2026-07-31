import { useCallback, useEffect, useRef, useState } from "react";
import { shieldApi } from "../services/api.js";

export const SIMULATOR_TOKEN_KEY = "availabilityshield.simulator.adminToken";
export const SIMULATOR_ID_KEY = "availabilityshield.simulator.id";

const idleSimulation = { status: "idle", progress: 0, completed: 0, total: 0 };

function readSessionToken() {
  try {
    return window.sessionStorage.getItem(SIMULATOR_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function readSimulationId() {
  try {
    return window.localStorage.getItem(SIMULATOR_ID_KEY) || "";
  } catch {
    return "";
  }
}

function saveSessionToken(token) {
  try {
    if (token) window.sessionStorage.setItem(SIMULATOR_TOKEN_KEY, token);
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

function saveSimulationId(id) {
  try {
    if (id) window.localStorage.setItem(SIMULATOR_ID_KEY, id);
    else window.localStorage.removeItem(SIMULATOR_ID_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

export function isSimulationActive(simulation) {
  return ["running", "cancelling"].includes(simulation?.status);
}

export function useSimulationController() {
  const [adminToken, setAdminTokenState] = useState(readSessionToken);
  const [simulation, setSimulation] = useState(() => {
    const id = readSimulationId();
    return id ? { ...idleSimulation, id, status: "checking" } : idleSimulation;
  });
  const [error, setError] = useState("");
  const mounted = useRef(true);

  const setAdminToken = useCallback((token) => {
    setAdminTokenState(token);
    saveSessionToken(token.trim());
  }, []);

  const refreshStatus = useCallback(async () => {
    const id = readSimulationId();
    if (!id) {
      if (mounted.current) setSimulation(idleSimulation);
      return idleSimulation;
    }

    try {
      const response = await shieldApi.simulationStatus(adminToken.trim(), id);
      const next = response.simulation || { ...idleSimulation, id };
      if (mounted.current) {
        if (next.status === "unknown") {
          saveSimulationId("");
          setSimulation(idleSimulation);
        } else {
          setSimulation(next);
        }
        setError("");
      }
      return next;
    } catch (requestError) {
      if (mounted.current) setError(requestError.message || "Could not read simulator status");
      return null;
    }
  }, [adminToken]);

  useEffect(() => {
    mounted.current = true;
    refreshStatus();
    const timer = window.setInterval(refreshStatus, 750);
    const onStorage = (event) => {
      if (event.key === SIMULATOR_ID_KEY) refreshStatus();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshStatus]);

  const start = useCallback(async (payload, token) => {
    const nextToken = token.trim();
    setAdminToken(nextToken);
    setError("");
    try {
      const response = await shieldApi.startSimulation(payload, nextToken);
      const next = response.simulation || idleSimulation;
      saveSimulationId(next.id || "");
      setSimulation(next);
      return next;
    } catch (requestError) {
      setError(requestError.message || "Could not start simulator");
      throw requestError;
    }
  }, [setAdminToken]);

  const cancel = useCallback(async () => {
    try {
      setError("");
      const response = await shieldApi.cancelSimulation(adminToken.trim());
      const next = response.simulation || { ...simulation, status: "cancelling" };
      setSimulation(next);
      return next;
    } catch (requestError) {
      setError(requestError.message || "Could not cancel simulator");
      return null;
    }
  }, [adminToken, simulation]);

  return {
    adminToken,
    setAdminToken,
    simulation,
    simulationError: error,
    simulationActive: isSimulationActive(simulation),
    startSimulation: start,
    cancelSimulation: cancel,
    refreshSimulation: refreshStatus
  };
}
