import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionState,
  LogRecord,
  TelemetryPoint,
  TelemetryTree,
} from "./types";

const HISTORY_LIMIT = 180;
const LOG_LIMIT = 200;
const POLL_INTERVAL_MS = 100;
const STALE_AFTER_MS = 500;
const configuredRobotUrl = import.meta.env.VITE_ROBOT_API_URL as string | undefined;

export function backendBaseUrl(): string {
  const saved = window.localStorage.getItem("field-telemetry-robot-url");
  return (saved ?? configuredRobotUrl ?? "http://192.168.43.1:8765").replace(/\/+$/, "");
}

export function apiUrl(path: string, baseUrl = backendBaseUrl()): string {
  return `${baseUrl}${path}`;
}

function numericValues(tree: TelemetryTree, prefix = ""): Array<[string, number]> {
  const values: Array<[string, number]> = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "number" && Number.isFinite(value)) {
      values.push([path, value]);
    } else if (value !== null && typeof value === "object") {
      values.push(...numericValues(value, path));
    }
  }
  return values;
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  if (window.fieldTelemetryDesktop) {
    return window.fieldTelemetryDesktop.requestRobotApi<T>(baseUrl, path);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  const abortFromParent = () => controller.abort();
  signal?.addEventListener("abort", abortFromParent, { once: true });
  try {
    const response = await fetch(apiUrl(path, baseUrl), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Robot API returned HTTP ${response.status}`);
    }
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromParent);
  }
}

function appendSnapshot(
  value: TelemetryTree,
  history: Record<string, TelemetryPoint[]>,
  timestamp: number,
): Record<string, TelemetryPoint[]> {
  const points = numericValues(value);
  const next: Record<string, TelemetryPoint[]> = points.length ? { ...history } : {};
  for (const [path, sample] of points) {
    next[path] = [...(next[path] ?? []), { timestamp, value: sample }].slice(-HISTORY_LIMIT);
  }
  return next;
}

function isTelemetryTree(value: unknown): value is TelemetryTree {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export interface TelemetryClient {
  snapshot: TelemetryTree;
  histories: Record<string, TelemetryPoint[]>;
  logs: LogRecord[];
  connection: ConnectionState;
  apiReachable: boolean;
  robotConnected: boolean;
  lastUpdate: number | null;
  error: string | null;
  checkConnection: () => void;
  refreshLogs: () => Promise<void>;
}

interface RobotHeartbeat {
  api_version: number;
  active: boolean;
  last_update: number;
  age_ms: number | null;
  timeout_ms: number;
}

export function useTelemetry(baseUrl: string): TelemetryClient {
  const [snapshot, setSnapshot] = useState<TelemetryTree>({});
  const [histories, setHistories] = useState<Record<string, TelemetryPoint[]>>({});
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [apiReachable, setApiReachable] = useState(false);
  const [robotConnected, setRobotConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<Record<string, TelemetryPoint[]>>({});
  const pollRef = useRef<(() => void) | null>(null);

  const clearTelemetry = useCallback(() => {
    historyRef.current = {};
    setSnapshot((current) => Object.keys(current).length ? {} : current);
    setHistories((current) => Object.keys(current).length ? {} : current);
    setLastUpdate((current) => current === null ? current : null);
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const records = await requestJson<LogRecord[]>(baseUrl, "/api/v1/logs");
      if (!Array.isArray(records)) {
        throw new Error("Robot API returned an invalid log list");
      }
      setLogs(records.slice(-LOG_LIMIT));
      setError(null);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message.includes("invalid log list")) {
        setError(requestError.message);
      }
    }
  }, [baseUrl]);

  useEffect(() => {
    void refreshLogs();
    const timer = window.setInterval(() => void refreshLogs(), 1500);
    return () => window.clearInterval(timer);
  }, [refreshLogs]);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let inFlight = false;
    let lastReachableAt = 0;
    let lastTelemetryAt = 0;
    const abortController = new AbortController();
    setConnection("checking");
    setApiReachable(false);
    setRobotConnected(false);
    setError(null);
    clearTelemetry();

    const poll = async () => {
      if (disposed || inFlight) return;
      inFlight = true;
      try {
        const heartbeat = await requestJson<RobotHeartbeat>(
          baseUrl,
          "/api/v1/heartbeat",
          abortController.signal,
        );
        if (disposed) return;
        if (typeof heartbeat.active !== "boolean" || heartbeat.api_version !== 1) {
          throw new Error("Robot API returned an invalid heartbeat");
        }
        lastReachableAt = Date.now();
        setApiReachable(true);
        setRobotConnected(heartbeat.active);

        if (!heartbeat.active) {
          setConnection("disconnected");
          lastTelemetryAt = 0;
          clearTelemetry();
        } else {
          setConnection("connected");
          const value = await requestJson<TelemetryTree>(
            baseUrl,
            "/api/v1/telemetry",
            abortController.signal,
          );
          if (disposed) return;
          if (!isTelemetryTree(value)) {
            throw new Error("Robot API returned an invalid telemetry snapshot");
          }
          const timestamp = Date.now();
          const next = appendSnapshot(value, historyRef.current, timestamp);
          historyRef.current = next;
          setSnapshot(value);
          setHistories(next);
          setLastUpdate(timestamp);
          setRobotConnected(true);
          lastTelemetryAt = timestamp;
        }
        setError(null);
      } catch (requestError) {
        if (disposed || abortController.signal.aborted) return;
        const now = Date.now();
        const apiStale = !lastReachableAt || now - lastReachableAt >= STALE_AFTER_MS;
        const telemetryStale = !lastTelemetryAt || now - lastTelemetryAt >= STALE_AFTER_MS;
        if (apiStale) {
          setApiReachable(false);
          setRobotConnected(false);
          clearTelemetry();
          setConnection("disconnected");
        } else if (telemetryStale) {
          clearTelemetry();
        }
        if (requestError instanceof Error && requestError.message.includes("invalid")) {
          setError(requestError.message);
        }
      } finally {
        inFlight = false;
        if (!disposed) {
          timer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    const checkConnection = () => {
      void poll();
    };
    pollRef.current = checkConnection;
    checkConnection();
    return () => {
      disposed = true;
      pollRef.current = null;
      abortController.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [baseUrl, clearTelemetry]);

  const checkConnection = useCallback(() => {
    pollRef.current?.();
  }, []);

  return {
    snapshot,
    histories,
    logs,
    connection,
    apiReachable,
    robotConnected,
    lastUpdate,
    error,
    checkConnection,
    refreshLogs,
  };
}
