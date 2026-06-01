import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY, RUNNING_KEY } from "../constants";
import { uid, sendTelegramAlert } from "../utils";

export function useMonitoring() {
  const [configs, setConfigs] = useState([]);
  const [monitoring, setMonitoring] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [savedRunningIds, setSavedRunningIds] = useState([]);

  const intervals = useRef({});
  const autoLaunched = useRef(false);
  const pingRef = useRef(null); // always points to latest ping to avoid stale closures in setInterval

  // ── Hydration ──────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(RUNNING_KEY),
    ])
      .then(([rawConfigs, rawRunning]) => {
        if (rawConfigs) setConfigs(JSON.parse(rawConfigs));
        if (rawRunning) setSavedRunningIds(JSON.parse(rawRunning));
      })
      .finally(() => setHydrated(true));
  }, []);

  // Auto-launch monitors that were running when the app was last closed
  useEffect(() => {
    if (!hydrated || autoLaunched.current || savedRunningIds.length === 0)
      return;
    autoLaunched.current = true;
    configs.filter((c) => savedRunningIds.includes(c.id)).forEach(launch);
  }, [hydrated, configs, savedRunningIds]);

  // Cleanup all intervals on unmount
  useEffect(
    () => () => Object.values(intervals.current).forEach(clearInterval),
    [],
  );

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  }, [configs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const runningIds = Object.entries(monitoring)
      .filter(([, m]) => m.isRunning)
      .map(([id]) => id);
    AsyncStorage.setItem(RUNNING_KEY, JSON.stringify(runningIds));
  }, [monitoring, hydrated]);

  // ── Core ping logic ────────────────────────────────────────────────────────

  async function ping(config) {
    const start = Date.now();
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      const res = await fetch(config.url, { method: "GET" });
      const responseTime = Date.now() - start;
      const status = {
        statusCode: res.status,
        responseTime,
        isOnline: res.ok,
        label: `${res.status} ${res.statusText || "OK"}`,
      };
      const entry = { id: uid(), timestamp, ...status };

      setMonitoring((prev) => {
        const wasOnline = prev[config.id]?.wasOnline ?? true;
        if (!res.ok && wasOnline)
          sendTelegramAlert(
            config,
            `🚨 PingPulse Alert\n\n${config.name}\n${config.url}\nStatus: ${status.label}\nTime: ${timestamp}`,
          );
        return {
          ...prev,
          [config.id]: {
            ...prev[config.id],
            status,
            wasOnline: res.ok,
            lastPingTs: Date.now(),
            latencyData: [
              ...(prev[config.id]?.latencyData ?? []).slice(-19),
              responseTime,
            ],
            history: [...(prev[config.id]?.history ?? []).slice(-99), entry],
          },
        };
      });
    } catch {
      const entry = {
        id: uid(),
        timestamp,
        statusCode: 0,
        responseTime: null,
        isOnline: false,
        label: "Offline",
      };

      setMonitoring((prev) => {
        const wasOnline = prev[config.id]?.wasOnline ?? true;
        if (wasOnline)
          sendTelegramAlert(
            config,
            `🚨 PingPulse Alert\n\n${config.name}\n${config.url}\nStatus: Offline\nTime: ${timestamp}`,
          );
        return {
          ...prev,
          [config.id]: {
            ...prev[config.id],
            status: {
              statusCode: 0,
              responseTime: null,
              isOnline: false,
              label: "Offline",
            },
            wasOnline: false,
            lastPingTs: Date.now(),
            latencyData: [
              ...(prev[config.id]?.latencyData ?? []).slice(-19),
              0,
            ],
            history: [...(prev[config.id]?.history ?? []).slice(-99), entry],
          },
        };
      });
    }
  }

  // Keep ref current so the setInterval always calls the latest version
  pingRef.current = ping;

  // ── Public actions ─────────────────────────────────────────────────────────

  function launch(config) {
    setMonitoring((prev) => ({
      ...prev,
      [config.id]: {
        ...prev[config.id],
        isRunning: true,
        wasOnline: true,
        latencyData: [],
      },
    }));
    ping(config);
    intervals.current[config.id] = setInterval(
      () => pingRef.current(config),
      config.frequency,
    );
  }

  function stop(id) {
    clearInterval(intervals.current[id]);
    delete intervals.current[id];
    setMonitoring((prev) => ({
      ...prev,
      [id]: { ...prev[id], isRunning: false },
    }));
  }

  function saveConfig(config) {
    setConfigs((prev) =>
      prev.find((c) => c.id === config.id)
        ? prev.map((c) => (c.id === config.id ? config : c))
        : [...prev, config],
    );
  }

  function deleteConfig(id) {
    stop(id);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setMonitoring((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return {
    configs,
    monitoring,
    hydrated,
    launch,
    stop,
    saveConfig,
    deleteConfig,
  };
}
