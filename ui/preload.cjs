const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fieldTelemetryDesktop", {
  requestRobotApi: (baseUrl, endpoint) =>
    ipcRenderer.invoke("robot-api:request", baseUrl, endpoint),
  checkOnBotJava: (baseUrl) => ipcRenderer.invoke("onbot-java:check", baseUrl),
  uploadOnBotJava: (baseUrl, filename, source) =>
    ipcRenderer.invoke("onbot-java:upload", baseUrl, filename, source),
  buildOnBotJava: (baseUrl) => ipcRenderer.invoke("onbot-java:build", baseUrl),
  startOnBotEmulator: () => ipcRenderer.invoke("onbot-emulator:start"),
  stopOnBotEmulator: () => ipcRenderer.invoke("onbot-emulator:stop"),
  selectRobotProject: () => ipcRenderer.invoke("robot-project:select"),
  loadRobotProject: () => ipcRenderer.invoke("robot-project:load"),
  saveRobotProjectSource: (relativePath, source, expectedSource) =>
    ipcRenderer.invoke("robot-project:save-source", relativePath, source, expectedSource),
  loadDashboards: () => ipcRenderer.invoke("dashboards:load"),
  saveMeasurement: (suggestedName, contents) =>
    ipcRenderer.invoke("measurement:save", suggestedName, contents),
  loadMeasurement: () => ipcRenderer.invoke("measurement:load"),
});

contextBridge.exposeInMainWorld("fieldTelemetrySimulator", {
  importProject: () => ipcRenderer.invoke("simulator:import-project"),
  importSample: () => ipcRenderer.invoke("simulator:import-sample"),
  getProjectInfo: () => ipcRenderer.invoke("simulator:get-project-info"),
  getSettings: () => ipcRenderer.invoke("simulator:get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("simulator:save-settings", settings),
  compileProject: () => ipcRenderer.invoke("simulator:compile-project"),
  runOpMode: (className) => ipcRenderer.invoke("simulator:run-opmode", className),
  stop: () => ipcRenderer.invoke("simulator:stop"),
  getApiState: () => ipcRenderer.invoke("simulator:get-api-state"),
  onApiState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("simulator:api-state", listener);
    return () => ipcRenderer.removeListener("simulator:api-state", listener);
  },
  setGamepad: (gamepad, state) => ipcRenderer.send("simulator:gamepad", gamepad, state),
  onOutput: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("simulator:output", listener);
    return () => ipcRenderer.removeListener("simulator:output", listener);
  },
});
