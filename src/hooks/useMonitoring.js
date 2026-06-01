import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY, RUNNING_KEY } from "../constants";
import { uid, sendTelegramAlert } from "../utils";
import { sendDownNotification } from "../notifications";

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

  // ── Error classifier ──────────────────────────────────────────────────────

  function classifyError(err) {
    if (err.name === 'AbortError') return { label: 'Timeout', errorType: 'timeout' };
    const msg = (err.message ?? '').toLowerCase();
    if (
      msg.includes('getaddrinfo') || msg.includes('unable to resolve') ||
      msg.includes('nodename nor servname') || msg.includes('enotfound') ||
      msg.includes('network request failed') || msg.includes('no address')
    ) return { label: 'DNS Error', errorType: 'dns' };
    if (
      msg.includes('ssl') || msg.includes('certificate') ||
      msg.includes('cert_') || msg.includes('handshake') || msg.includes('pkix')
    ) return { label: 'SSL Error', errorType: 'ssl' };
    return { label: 'Connection Failed', errorType: 'unknown' };
  }

  // ── Core ping logic ────────────────────────────────────────────────────────

  async function ping(config) {
    const start      = Date.now();
    const method     = config.method ?? 'GET';
    const timeoutMs  = 10000;
    const timestamp  = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const controller  = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    setMonitoring(prev => ({
      ...prev,
      [config.id]: { ...prev[config.id], isPinging: true },
    }));

    try {
      const res = await fetch(config.url, { method, signal: controller.signal });
      clearTimeout(timeoutHandle);
      const responseTime = Date.now() - start;

      let isOnline  = res.ok;
      let label     = `${res.status} ${res.statusText || 'OK'}`;
      let errorType = res.ok ? null : 'http';
      let anomaly   = null;

      // Keyword matching — only meaningful with GET (HEAD has no body)
      if (method === 'GET' && config.keyword?.trim() && res.ok) {
        try {
          const body = await res.text();
          if (!body.includes(config.keyword.trim())) {
            isOnline  = false;
            anomaly   = `keyword "${config.keyword.trim()}" not found`;
            label     = `200 OK — ${anomaly}`;
            errorType = 'anomaly';
          }
        } catch {}
      }

      const status = { statusCode: res.status, responseTime, isOnline, label, errorType, anomaly };
      const entry  = { id: uid(), timestamp, ...status };

      setMonitoring((prev) => {
        const wasOnline = prev[config.id]?.wasOnline ?? true;
        if (!isOnline && wasOnline) {
          sendTelegramAlert(config, `🚨 PingPulse Alert\n\n${config.name}\n${config.url}\nStatus: ${label}\nTime: ${timestamp}`);
          sendDownNotification(config, label);
        }
        return {
          ...prev,
          [config.id]: {
            ...prev[config.id],
            status,
            wasOnline:  isOnline,
            isPinging:  false,
            lastPingTs:  Date.now(),
            latencyData: [...(prev[config.id]?.latencyData ?? []).slice(-19), responseTime],
            history:     [...(prev[config.id]?.history     ?? []).slice(-99), entry],
          },
        };
      });

    } catch (err) {
      clearTimeout(timeoutHandle);
      const { label, errorType } = classifyError(err);
      const status = { statusCode: 0, responseTime: null, isOnline: false, label, errorType, anomaly: null };
      const entry  = { id: uid(), timestamp, ...status };

      setMonitoring((prev) => {
        const wasOnline = prev[config.id]?.wasOnline ?? true;
        if (wasOnline) {
          sendTelegramAlert(config, `🚨 PingPulse Alert\n\n${config.name}\n${config.url}\nStatus: ${label}\nTime: ${timestamp}`);
          sendDownNotification(config, label);
        }
        return {
          ...prev,
          [config.id]: {
            ...prev[config.id],
            status,
            wasOnline:  false,
            isPinging:  false,
            lastPingTs:  Date.now(),
            latencyData: [...(prev[config.id]?.latencyData ?? []).slice(-19), 0],
            history:     [...(prev[config.id]?.history     ?? []).slice(-99), entry],
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
