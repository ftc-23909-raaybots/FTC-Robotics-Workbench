const http = require("node:http");

const API_VERSION = 1;
const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = 6302;
const HEARTBEAT_TIMEOUT_MS = 500;
const MAX_LOG_RECORDS = 200;
const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createSimulationApi({ host = DEFAULT_HOST, port = DEFAULT_PORT, onStateChange = () => {} } = {}) {
  let server = null;
  let stopPromise = null;
  let latestFrame = null;
  let lastUpdate = 0;
  let logs = [];

  function telemetrySnapshot() {
    const simulator = latestFrame?.simulator;
    if (!isRecord(simulator)) return {};
    return {
      robot: {
        name: "FTC Simulator",
        mode: simulator.opmode ?? "Unknown OpMode",
        state: "SIMULATING",
      },
      simulator: {
        time: simulator.time,
        pose: simulator.pose ?? {},
        field: simulator.field ?? {},
      },
      motors: simulator.motors ?? {},
      servos: simulator.servos ?? {},
      sensors: simulator.sensors ?? {},
      telemetry: simulator.telemetry ?? {},
    };
  }

  function sendJson(response, statusCode, value, headers = {}) {
    response.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    });
    response.end(JSON.stringify(value));
  }

  function handleRequest(request, response) {
    const origin = request.headers.origin;
    if (origin && !DEVELOPMENT_ORIGINS.has(origin)) {
      sendJson(response, 403, { error: "This origin is not allowed." });
      return;
    }
    const corsHeaders = origin
      ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Accept",
        Vary: "Origin",
      }
      : {};
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Only GET requests are supported." }, corsHeaders);
      return;
    }

    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname === "/api/v1/heartbeat") {
      const age = lastUpdate ? Date.now() - lastUpdate : null;
      sendJson(response, 200, {
        api_version: API_VERSION,
        active: age !== null && age < HEARTBEAT_TIMEOUT_MS,
        last_update: lastUpdate,
        age_ms: age,
        timeout_ms: HEARTBEAT_TIMEOUT_MS,
      }, corsHeaders);
      return;
    }
    if (pathname === "/api/v1/telemetry") {
      sendJson(response, 200, telemetrySnapshot(), corsHeaders);
      return;
    }
    if (pathname === "/api/v1/logs") {
      sendJson(response, 200, logs, corsHeaders);
      return;
    }
    sendJson(response, 404, { error: "Endpoint not found." }, corsHeaders);
  }

  function acceptOutput(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (!isRecord(message)) return;

    if (message.event === "telemetry_update" && isRecord(message.data)) {
      latestFrame = message.data;
      lastUpdate = Date.now();
    } else if (message.event === "telemetry_screen" && isRecord(message.data)) {
      const entries = Array.isArray(message.data.log) ? message.data.log : [];
      logs = entries.slice(-MAX_LOG_RECORDS).map((entry, index) => ({
        sequence: index + 1,
        timestamp: Date.now(),
        level: "INFO",
        message: String(entry),
        component: String(message.data.opmode ?? "FTC Simulator"),
      }));
    } else if (message.event === "error" || message.event === "console") {
      logs = [...logs, {
        sequence: (logs.at(-1)?.sequence ?? 0) + 1,
        timestamp: Date.now(),
        level: message.event === "error" || message.level === "error" ? "ERROR" : "INFO",
        message: String(message.message ?? line),
        component: "FTC Simulator",
      }].slice(-MAX_LOG_RECORDS);
    }
  }

  async function start() {
    if (stopPromise) await stopPromise;
    if (server?.listening) return;

    const nextServer = http.createServer(handleRequest);
    server = nextServer;
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          nextServer.removeListener("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          nextServer.removeListener("error", onError);
          resolve();
        };
        nextServer.once("error", onError);
        nextServer.once("listening", onListening);
        nextServer.listen(port, host);
      });
      onStateChange(true);
    } catch (error) {
      server = null;
      throw new Error(`Unable to start the local simulation API at http://${host}:${port}: ${error.message}`);
    }
  }

  async function stop() {
    if (stopPromise) return stopPromise;
    if (!server) return;

    const currentServer = server;
    server = null;
    stopPromise = new Promise((resolve, reject) => {
      currentServer.close((error) => error ? reject(error) : resolve());
    }).finally(() => {
      stopPromise = null;
      latestFrame = null;
      lastUpdate = 0;
      logs = [];
      onStateChange(false);
    });
    return stopPromise;
  }

  return {
    acceptOutput,
    address: () => server?.address() ?? null,
    isRunning: () => Boolean(server?.listening),
    start,
    stop,
  };
}

module.exports = { createSimulationApi };
