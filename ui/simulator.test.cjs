const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  defaultSimulationSettings,
  isSafeClassName,
  normalizeSimulationSettings,
  registerSimulator,
  walkJavaFiles,
} = require("./simulator.cjs");
const { createSimulationApi } = require("./simulator-api.cjs");

test("local simulator API serves telemetry, heartbeat, and logs on loopback", async (context) => {
  const states = [];
  const api = createSimulationApi({
    host: "localhost",
    port: 0,
    onStateChange: (running) => states.push(running),
  });
  context.after(() => api.stop());
  await api.start();
  const address = api.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://localhost:${address.port}`;

  const inactive = await fetch(`${baseUrl}/api/v1/heartbeat`).then((response) => response.json());
  assert.equal(inactive.api_version, 1);
  assert.equal(inactive.active, false);
  const preflight = await fetch(`${baseUrl}/api/v1/heartbeat`, {
    method: "OPTIONS",
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  const blockedOrigin = await fetch(`${baseUrl}/api/v1/heartbeat`, {
    headers: { Origin: "https://example.com" },
  });
  assert.equal(blockedOrigin.status, 403);

  api.acceptOutput(JSON.stringify({
    event: "telemetry_update",
    data: {
      simulator: {
        opmode: "org.example.DriveMode",
        time: 1.25,
        pose: { x: 3, y: 4, heading: 90 },
        field: { widthIn: 144, lengthIn: 144, robotWidthCm: 40, robotLengthCm: 37 },
        motors: { frontLeft: { power: 0.5, position: 128 } },
        servos: {},
        sensors: {},
        telemetry: { heading: 90 },
      },
    },
  }));
  api.acceptOutput(JSON.stringify({
    event: "telemetry_screen",
    data: { opmode: "org.example.DriveMode", log: ["simulation ready"] },
  }));

  const active = await fetch(`${baseUrl}/api/v1/heartbeat`).then((response) => response.json());
  assert.equal(active.active, true);
  const telemetry = await fetch(`${baseUrl}/api/v1/telemetry`).then((response) => response.json());
  assert.equal(telemetry.robot.name, "FTC Simulator");
  assert.equal(telemetry.robot.mode, "org.example.DriveMode");
  assert.equal(telemetry.motors.frontLeft.position, 128);
  assert.equal(telemetry.telemetry.heading, 90);
  const logs = await fetch(`${baseUrl}/api/v1/logs`).then((response) => response.json());
  assert.equal(logs[0].message, "simulation ready");

  const missingEndpoint = await fetch(`${baseUrl}/api/v1/unknown`);
  assert.equal(missingEndpoint.status, 404);
  const rejectedMethod = await fetch(`${baseUrl}/api/v1/heartbeat`, { method: "POST" });
  assert.equal(rejectedMethod.status, 405);

  await api.stop();
  assert.equal(api.isRunning(), false);
  assert.deepEqual(states, [true, false]);
});

test("walkJavaFiles finds nested Java source and skips generated folders", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "raaybots-simulator-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "src", "teamcode"), { recursive: true });
  fs.mkdirSync(path.join(root, "build"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "teamcode", "Drive.java"), "class Drive {}");
  fs.writeFileSync(path.join(root, "build", "Generated.java"), "class Generated {}");

  const files = walkJavaFiles(root);
  assert.deepEqual(files.map((file) => path.relative(root, file)), [
    path.join("src", "teamcode", "Drive.java"),
  ]);
});

test("walkJavaFiles enforces per-file, total-byte, and file-count limits", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "raaybots-simulator-limits-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(path.join(root, "large.java"), Buffer.alloc(1024 * 1024 + 1));
  assert.throws(() => walkJavaFiles(root), /1 MB Java file limit/);
  fs.rmSync(path.join(root, "large.java"));

  for (let index = 0; index < 11; index++) {
    fs.writeFileSync(path.join(root, `source-${index}.java`), Buffer.alloc(1024 * 1024));
  }
  assert.throws(() => walkJavaFiles(root), /10 MB project import limit/);
  for (const file of fs.readdirSync(root)) fs.rmSync(path.join(root, file));

  for (let index = 0; index < 251; index++) {
    fs.writeFileSync(path.join(root, `source-${index}.java`), "");
  }
  assert.throws(() => walkJavaFiles(root), /more than 250 Java files/);
});

test("linking a project saves its root without copying or modifying source files", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "raaybots-project-link-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const selectedRoot = path.join(root, "FTC Robot Project");
  const userData = path.join(root, "app-data");
  const sourceDirectory = path.join(selectedRoot, "TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode");
  fs.mkdirSync(sourceDirectory, { recursive: true });
  const opMode = path.join(sourceDirectory, "Drive.java");
  const helper = path.join(sourceDirectory, "DriveHelper.java");
  const originalOpMode = "package org.firstinspires.ftc.teamcode;\nclass Drive {}\n";
  const originalHelper = "package org.firstinspires.ftc.teamcode;\nclass DriveHelper {}\n";
  fs.writeFileSync(opMode, originalOpMode);
  fs.writeFileSync(helper, originalHelper);

  const handlers = new Map();
  const app = { isPackaged: false, getPath: () => userData, on: () => {} };
  const dialog = {
    showOpenDialog: async () => ({ canceled: false, filePaths: [selectedRoot] }),
  };
  const ipcMain = {
    handle: (name, callback) => handlers.set(name, callback),
    on: () => {},
  };
  registerSimulator(ipcMain, {
    app,
    dialog,
    BrowserWindow: { getAllWindows: () => [] },
  });

  const linked = await handlers.get("simulator:import-project")();
  assert.equal(linked.ok, true, linked.error);
  assert.equal(linked.files, 2);
  assert.equal(linked.projectPath, selectedRoot);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(userData, "simulator", "project.json"), "utf8")), {
    rootPath: selectedRoot,
  });
  assert.equal(fs.existsSync(path.join(userData, "simulator", "project")), false);
  assert.equal(fs.readFileSync(opMode, "utf8"), originalOpMode);
  assert.equal(fs.readFileSync(helper, "utf8"), originalHelper);

  const info = await handlers.get("simulator:get-project-info")();
  assert.equal(info.ok, true);
  assert.equal(info.files, 2);
  assert.equal(info.projectPath, selectedRoot);
});

test("OpMode class names accept package names and reject unsafe input", () => {
  assert.equal(isSafeClassName("org.firstinspires.ftc.teamcode.TankDrive"), true);
  assert.equal(isSafeClassName("TankDrive"), true);
  assert.equal(isSafeClassName("../TankDrive"), false);
  assert.equal(isSafeClassName("java.lang.Runtime#exec"), false);
  assert.equal(isSafeClassName("x".repeat(201)), false);
  assert.equal(isSafeClassName(null), false);
});

test("hardware profiles and sensor definitions validate and persist", async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "raaybots-hardware-settings-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const handlers = new Map();
  registerSimulator(
    { handle: (name, callback) => handlers.set(name, callback), on: () => {} },
    {
      app: { isPackaged: false, getPath: () => root, on: () => {} },
      dialog: {},
      BrowserWindow: { getAllWindows: () => [] },
    },
  );

  const initial = await handlers.get("simulator:get-settings")();
  assert.equal(initial.ok, true);
  assert.equal(initial.settings.fieldWidthIn, 144);
  assert.equal(initial.settings.robotWidthCm, 40);
  assert.equal(initial.settings.robotLengthCm, 37);

  const settings = defaultSimulationSettings();
  settings.motors.frontLeft = {
    maxRpm: 5200,
    gearRatio: 13.7,
    wheelDiameterCm: 9.2,
    ticksPerRev: 28,
  };
  settings.sensors = [{ name: "frontRange", type: "distance", direction: "front" }];
  const saved = await handlers.get("simulator:save-settings")(null, settings);
  assert.equal(saved.ok, true, saved.error);
  assert.equal(saved.settings.motors.frontLeft.gearRatio, 13.7);
  assert.deepEqual(saved.settings.sensors, settings.sensors);

  const savedProperties = fs.readFileSync(
    path.join(root, "simulator", "hardware-settings.properties"),
    "utf8",
  );
  assert.match(savedProperties, /motor\.0\.gearRatio=13\.7/);
  assert.match(savedProperties, /sensor\.0\.type=distance/);
  assert.throws(
    () => normalizeSimulationSettings({ ...settings, fieldWidthIn: 5 }),
    /Field width must be between/,
  );
  assert.throws(
    () => normalizeSimulationSettings({
      ...settings,
      sensors: [{ name: "../range", type: "distance", direction: "front" }],
    }),
    /Sensor names must start/,
  );
  const loaded = await handlers.get("simulator:get-settings")();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.settings.motors.frontLeft.maxRpm, 5200);
  assert.deepEqual(loaded.settings.sensors, settings.sensors);
});
