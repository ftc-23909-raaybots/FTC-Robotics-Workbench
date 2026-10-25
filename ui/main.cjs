const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { registerSimulator } = require("./simulator.cjs");
const { checkOnBotJava, uploadJavaSource, buildOnBotJava } = require("./onbot-api.cjs");
const { createOnBotJavaEmulator } = require("./onbot-emulator.cjs");
const { readJavaProject, saveJavaProjectSource } = require("./robot-project.cjs");

const ROBOT_API_PATHS = new Set([
  "/api/v1/heartbeat",
  "/api/v1/telemetry",
  "/api/v1/logs",
]);
const MAX_API_RESPONSE_BYTES = 1024 * 1024;
const MAX_MEASUREMENT_BYTES = 5 * 1024 * 1024;
const onBotJavaEmulator = createOnBotJavaEmulator();

// Keep existing robot profiles and simulator preferences across the product rename.
app.setPath("userData", path.join(app.getPath("appData"), "Field Telemetry"));

async function readLimitedResponse(response, maximumBytes) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error(`Robot API response exceeds the ${maximumBytes / (1024 * 1024)} MB limit.`);
    }
    chunks.push(Buffer.from(result.value));
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

function registerRobotApi() {
  ipcMain.handle("onbot-emulator:start", () => onBotJavaEmulator.start());
  ipcMain.handle("onbot-emulator:stop", () => onBotJavaEmulator.stop());

  ipcMain.handle("dashboards:load", async () => {
    const directory = app.isPackaged
      ? path.join(process.resourcesPath, "dashboards")
      : path.resolve(__dirname, "..", "resources", "dashboards");
    const filenames = (await fs.readdir(directory))
      .filter((filename) => filename.toLowerCase().endsWith(".json"))
      .sort();
    const definitions = [];
    for (const filename of filenames) {
      if (definitions.length >= 100) {
        throw new Error("A maximum of 100 dashboard definitions is supported.");
      }
      const filePath = path.join(directory, filename);
      if ((await fs.stat(filePath)).size > MAX_API_RESPONSE_BYTES) {
        throw new Error(`Dashboard definition ${filename} exceeds the 1 MB limit.`);
      }
      const value = JSON.parse(await fs.readFile(filePath, "utf8"));
      if (!value || typeof value.name !== "string" || !value.name.trim() ||
          !Array.isArray(value.widgets) || value.widgets.length > 100 || value.widgets.some((widget) =>
            !widget || typeof widget.type !== "string" || typeof widget.source !== "string")) {
        throw new Error(`Dashboard definition ${filename} has an invalid format.`);
      }
      definitions.push(value);
    }
    return definitions;
  });

  ipcMain.handle("robot-api:request", async (_event, baseUrl, endpoint) => {
    if (typeof baseUrl !== "string" || typeof endpoint !== "string" ||
        !ROBOT_API_PATHS.has(endpoint)) {
      throw new Error("Invalid robot API request.");
    }

    let robotUrl;
    try {
      robotUrl = new URL(baseUrl);
    } catch {
      throw new Error("Enter a valid robot API address.");
    }
    if (!["http:", "https:"].includes(robotUrl.protocol) ||
        robotUrl.username || robotUrl.password || robotUrl.search || robotUrl.hash ||
        (robotUrl.pathname !== "/" && robotUrl.pathname !== "")) {
      throw new Error("Robot API address must be an HTTP or HTTPS origin.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await fetch(new URL(endpoint, robotUrl.origin), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Robot API returned HTTP ${response.status}.`);
      }
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_API_RESPONSE_BYTES) {
        throw new Error("Robot API response exceeds the 1 MB limit.");
      }
      const body = await readLimitedResponse(response, MAX_API_RESPONSE_BYTES);
      try {
        return JSON.parse(body);
      } catch {
        throw new Error("Robot API returned invalid JSON.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Robot API request timed out after 2 seconds.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });

  ipcMain.handle("onbot-java:check", async (_event, baseUrl) =>
    checkOnBotJava(baseUrl));
  ipcMain.handle("onbot-java:upload", async (_event, baseUrl, filename, source) =>
    uploadJavaSource(baseUrl, filename, source));
  ipcMain.handle("onbot-java:build", async (_event, baseUrl) =>
    buildOnBotJava(baseUrl));

  const robotProjectPath = path.join(app.getPath("userData"), "robot-project.json");
  ipcMain.handle("robot-project:select", async () => {
    const selection = await dialog.showOpenDialog({
      title: "Select your FTC Java project root",
      properties: ["openDirectory"],
      buttonLabel: "Link project folder",
    });
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true };

    const project = await readJavaProject(selection.filePaths[0]);
    await fs.mkdir(path.dirname(robotProjectPath), { recursive: true });
    await fs.writeFile(robotProjectPath, JSON.stringify({ rootPath: project.projectPath }, null, 2), "utf8");
    return project;
  });
  ipcMain.handle("robot-project:load", async () => {
    let config;
    try {
      config = JSON.parse(await fs.readFile(robotProjectPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw new Error(`Unable to load the linked robot project: ${error.message}`);
    }
    if (!config || typeof config.rootPath !== "string" || !path.isAbsolute(config.rootPath)) {
      throw new Error("The saved project folder is invalid. Link the project again.");
    }
    return readJavaProject(config.rootPath);
  });
  ipcMain.handle("robot-project:save-source", async (_event, relativePath, source, expectedSource) => {
    let config;
    try {
      config = JSON.parse(await fs.readFile(robotProjectPath, "utf8"));
    } catch (error) {
      throw new Error(error?.code === "ENOENT"
        ? "Link a robot project folder before saving project files."
        : `Unable to read the linked project folder: ${error.message}`);
    }
    if (!config || typeof config.rootPath !== "string" || !path.isAbsolute(config.rootPath)) {
      throw new Error("The saved project folder is invalid. Link the project again.");
    }
    return saveJavaProjectSource(config.rootPath, relativePath, source, expectedSource);
  });

  ipcMain.handle("measurement:save", async (_event, suggestedName, contents) => {
    if (typeof suggestedName !== "string" || typeof contents !== "string" ||
        Buffer.byteLength(contents, "utf8") > MAX_MEASUREMENT_BYTES) {
      throw new Error("Measurement export is invalid or exceeds the 5 MB limit.");
    }
    const safeName = suggestedName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "measurement";
    const filename = safeName.toLowerCase().endsWith(".json") ? safeName : `${safeName}.json`;
    JSON.parse(contents);

    const directory = path.join(app.getPath("userData"), "measurements");
    await fs.mkdir(directory, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: "Export measurement",
      defaultPath: path.join(directory, filename),
      filters: [{ name: "JSON measurement", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return { saved: false };
    await fs.writeFile(result.filePath, contents, { encoding: "utf8" });
    return { saved: true, filename: path.basename(result.filePath) };
  });

  ipcMain.handle("measurement:load", async () => {
    const directory = path.join(app.getPath("userData"), "measurements");
    const result = await dialog.showOpenDialog({
      title: "Import measurement",
      defaultPath: directory,
      properties: ["openFile"],
      filters: [{ name: "JSON measurement", extensions: ["json"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_MEASUREMENT_BYTES) {
      throw new Error("Measurement file exceeds the 5 MB limit.");
    }
    const value = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        (!Array.isArray(value.samples) && !Array.isArray(value.measurements))) {
      throw new Error("The selected JSON file is not a supported measurement.");
    }
    return { filename: path.basename(filePath), value };
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1280,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "app-icon.ico"),
    backgroundColor: "#fffdf5",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.once("ready-to-show", () => window.show());
  window.loadFile(path.join(__dirname, "dist", "index.html"));
}

registerSimulator(ipcMain, { app, dialog, BrowserWindow });
registerRobotApi();

app.whenReady().then(() => {
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void onBotJavaEmulator.stop().catch((error) => {
    console.error("Failed to stop the local OnBotJava mock cleanly.", error);
  });
});
