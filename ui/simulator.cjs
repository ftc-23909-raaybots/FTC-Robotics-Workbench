const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createSimulationApi } = require("./simulator-api.cjs");

const MAX_SOURCE_FILES = 250;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 1024 * 1024;
const SENSOR_TYPES = new Set(["distance", "color", "analog", "digital", "touch", "voltage"]);
const SENSOR_DIRECTIONS = new Set(["front", "back", "left", "right", "down"]);
const EXCLUDED_DIRECTORIES = new Set([
  ".git", ".gradle", ".idea", "build", "out", "target", "node_modules",
]);

function defaultSimulationSettings() {
  return {
    fieldWidthIn: 144,
    fieldLengthIn: 144,
    robotWidthCm: 40,
    robotLengthCm: 37,
    motorDefaults: { maxRpm: 6000, gearRatio: 19.2, wheelDiameterCm: 9.6, ticksPerRev: 28 },
    motors: {},
    sensors: [],
  };
}

function normalizeSimulationSettings(value) {
  const defaults = defaultSimulationSettings();
  const number = (input, fallback, name, min, max) => {
    const result = input === undefined ? fallback : Number(input);
    if (!Number.isFinite(result) || result < min || result > max) {
      throw new Error(`${name} must be between ${min} and ${max}.`);
    }
    return result;
  };
  const motor = (input, fallback, label) => ({
    maxRpm: number(input?.maxRpm, fallback.maxRpm, `${label} max RPM`, 100, 20000),
    gearRatio: number(input?.gearRatio, fallback.gearRatio, `${label} gear ratio`, 0.1, 200),
    wheelDiameterCm: number(input?.wheelDiameterCm, fallback.wheelDiameterCm, `${label} wheel diameter`, 1, 30),
    ticksPerRev: number(input?.ticksPerRev, fallback.ticksPerRev, `${label} encoder ticks per revolution`, 1, 10000),
  });
  const validName = (name) => typeof name === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,47}$/.test(name);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Simulation settings must be an object.");
  }
  const motors = {};
  for (const [name, profile] of Object.entries(value.motors ?? {})) {
    if (!validName(name)) throw new Error(`Invalid motor profile name: ${name}`);
    if (Object.keys(motors).length >= 32) throw new Error("A maximum of 32 motor profiles is supported.");
    motors[name] = motor(profile, defaults.motorDefaults, `Motor ${name}`);
  }
  if (!Array.isArray(value.sensors) || value.sensors.length > 32) {
    throw new Error("Configure between 0 and 32 simulated sensors.");
  }
  const names = new Set();
  const sensors = value.sensors.map((sensor) => {
    if (!sensor || !validName(sensor.name)) throw new Error("Sensor names must start with a letter and contain only letters, numbers, '.', '_' or '-'.");
    if (names.has(sensor.name)) throw new Error(`Sensor name is already configured: ${sensor.name}`);
    if (!SENSOR_TYPES.has(sensor.type)) throw new Error(`Unsupported sensor type: ${sensor.type}`);
    const direction = sensor.direction ?? "front";
    if (!SENSOR_DIRECTIONS.has(direction)) throw new Error(`Unsupported sensor direction: ${direction}`);
    names.add(sensor.name);
    return { name: sensor.name, type: sensor.type, direction };
  });
  return {
    fieldWidthIn: number(value.fieldWidthIn, defaults.fieldWidthIn, "Field width", 12, 1000),
    fieldLengthIn: number(value.fieldLengthIn, defaults.fieldLengthIn, "Field length", 12, 1000),
    robotWidthCm: number(value.robotWidthCm, defaults.robotWidthCm, "Robot width", 5, 200),
    robotLengthCm: number(value.robotLengthCm, defaults.robotLengthCm, "Robot length", 5, 200),
    motorDefaults: motor(value.motorDefaults, defaults.motorDefaults, "Default motor"),
    motors,
    sensors,
  };
}

function walkJavaFiles(root, directory = root, files = [], byteCount = { value: 0 }) {
  const entries = require("node:fs").readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        walkJavaFiles(root, fullPath, files, byteCount);
      }
    } else if (entry.isFile() && entry.name.endsWith(".java")) {
      const stat = require("node:fs").statSync(fullPath);
      if (stat.size > MAX_SINGLE_FILE_BYTES) {
        throw new Error(`${path.relative(root, fullPath)} exceeds the 1 MB Java file limit.`);
      }
      byteCount.value += stat.size;
      if (byteCount.value > MAX_SOURCE_BYTES) {
        throw new Error("Java source exceeds the 10 MB project import limit.");
      }
      files.push(fullPath);
      if (files.length > MAX_SOURCE_FILES) {
        throw new Error("Project contains more than 250 Java files.");
      }
    }
  }
  return files;
}

function locateJdk() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, "bin"));

  const command = process.platform === "win32" ? "where.exe" : "which";
  const found = spawnSync(command, ["javac"], { encoding: "utf8", windowsHide: true });
  if (found.status === 0) {
    for (const line of found.stdout.split(/\r?\n/).filter(Boolean)) {
      candidates.push(path.dirname(line.trim()));
    }
  }

  for (const candidate of candidates) {
    const javac = path.join(candidate, process.platform === "win32" ? "javac.exe" : "javac");
    const java = path.join(candidate, process.platform === "win32" ? "java.exe" : "java");
    if (require("node:fs").existsSync(javac) && require("node:fs").existsSync(java)) {
      return { javac, java };
    }
  }
  throw new Error("A JDK was not found. Install a JDK and add its bin directory to JAVA_HOME or PATH.");
}

async function runCommand(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new Error(`Java process exceeded the ${Math.round(options.timeoutMs / 1000)} second time limit.`));
      }
    }, options.timeoutMs ?? 60000);
    timer.unref();

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-1024 * 1024);
      options.onStdout?.(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-64 * 1024);
      options.onStderr?.(chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`Unable to start ${path.basename(executable)}: ${error.message}`));
      }
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({ code: code ?? 1, signal, stdout, stderr, child });
    });
    options.onChild?.(child);
  });
}

async function compileJava(javac, args, argFileDirectory, cwd, timeoutMs) {
  const argFile = path.join(argFileDirectory, "javac.args");
  const quotedArgs = args.map((argument) =>
    `"${argument.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  await fs.writeFile(argFile, quotedArgs.join(os.EOL), "utf8");
  try {
    return await runCommand(javac, [`@${argFile}`], { cwd, timeoutMs });
  } finally {
    await fs.rm(argFile, { force: true });
  }
}

function isSafeClassName(value) {
  return typeof value === "string" &&
    value.length <= 200 &&
    value.split(".").every((part) => /^[A-Za-z_$][\w$]*$/.test(part));
}

function registerSimulator(ipcMain, options) {
  const { app, dialog, BrowserWindow } = options;
  const userData = app.getPath("userData");
  const simulatorRoot = path.join(userData, "simulator");
  const projectConfigPath = path.join(simulatorRoot, "project.json");
  const settingsConfigPath = path.join(simulatorRoot, "hardware-settings.json");
  const settingsPropertiesPath = path.join(simulatorRoot, "hardware-settings.properties");
  const classRoot = path.join(simulatorRoot, "classes");
  const sdkSourceRoot = app.isPackaged
    ? path.join(process.resourcesPath, "ftc-sim-sdk-src")
    : path.join(__dirname, "simulator-sdk", "src");
  const sampleSourceRoot = app.isPackaged
    ? path.join(process.resourcesPath, "ftc-sim-example")
    : path.resolve(__dirname, "..", "examples", "simulator-project");
  const compiledSdkRoot = path.join(simulatorRoot, "sdk-classes");
  let simulatorProcess = null;
  let compiledFileCount = 0;
  let compiledProjectRoot = null;
  let simulatorShutdownStarted = false;
  const simulationApi = createSimulationApi({
    onStateChange: (running) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) {
          window.webContents.send("simulator:api-state", { running });
        }
      }
    },
  });

  function emitOutput(line) {
    simulationApi.acceptOutput(line);
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send("simulator:output", line);
    }
  }

  function stopProcess() {
    if (!simulatorProcess) return simulationApi.stop();
    const child = simulatorProcess;
    simulatorProcess = null;
    return new Promise((resolve) => {
      let settled = false;
      let timer;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        simulationApi.stop().then(resolve, reject);
      };
      child.once("close", finish);
      if (child.exitCode !== null || child.signalCode !== null) {
        finish();
        return;
      }
      if (child.stdin.writable) child.stdin.end('{"type":"stop"}\n');
      timer = setTimeout(() => {
        if (child.exitCode === null) child.kill();
      }, 1500);
      timer.unref();
    });
  }

  async function linkSourceDirectory(selectedRoot) {
    try {
      const projectRoot = path.resolve(selectedRoot);
      if (!require("node:fs").statSync(projectRoot).isDirectory()) {
        throw new Error("Select a Java project directory.");
      }
      const sources = walkJavaFiles(projectRoot);
      if (sources.length === 0) {
        throw new Error("No .java files were found in the selected folder.");
      }
      await fs.mkdir(simulatorRoot, { recursive: true });
      await fs.writeFile(projectConfigPath, JSON.stringify({ rootPath: projectRoot }, null, 2));
      compiledFileCount = sources.length;
      compiledProjectRoot = null;
      return {
        ok: true,
        files: sources.length,
        projectPath: projectRoot,
        projectName: path.basename(projectRoot),
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async function readProjectInfo() {
    let config;
    try {
      config = JSON.parse(await fs.readFile(projectConfigPath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return { ok: false, files: 0, error: "Link your FTC Java project folder to get started." };
      }
      return { ok: false, files: 0, error: `Unable to read saved project location: ${error.message}` };
    }
    if (typeof config.rootPath !== "string" || !path.isAbsolute(config.rootPath)) {
      return { ok: false, files: 0, error: "Saved Java project location is invalid. Link the project folder again." };
    }
    try {
      const projectPath = path.resolve(config.rootPath);
      const files = walkJavaFiles(projectPath);
      if (files.length === 0) {
        return { ok: false, files: 0, projectPath, error: "No Java source files were found in the linked project." };
      }
      return { ok: true, files: files.length, projectPath, projectName: path.basename(projectPath) };
    } catch (error) {
      return {
        ok: false,
        files: 0,
        projectPath: config.rootPath,
        error: error.code === "ENOENT"
          ? `Linked Java project folder is unavailable: ${config.rootPath}. Link the project folder again.`
          : error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function resolveProjectSources() {
    let config;
    try {
      config = JSON.parse(await fs.readFile(projectConfigPath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") throw new Error("Link your FTC Java project folder before compiling.");
      throw new Error(`Unable to read the linked Java project location: ${error.message}`);
    }
    if (typeof config.rootPath !== "string" || !path.isAbsolute(config.rootPath)) {
      throw new Error("Saved Java project location is invalid. Link the project folder again.");
    }
    const projectRoot = path.resolve(config.rootPath);
    if (!require("node:fs").existsSync(projectRoot)) {
      throw new Error(`Linked Java project folder is unavailable: ${projectRoot}. Link the project folder again.`);
    }
    const sources = walkJavaFiles(projectRoot);
    if (sources.length === 0) throw new Error("No Java source files were found in the linked project.");
    return { projectRoot, sources };
  }

  ipcMain.handle("simulator:import-project", async () => {
    const result = await dialog.showOpenDialog({
      title: "Link your FTC Java project root",
      properties: ["openDirectory"],
      buttonLabel: "Link project folder",
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, error: "Import cancelled." };

    return linkSourceDirectory(result.filePaths[0]);
  });

  ipcMain.handle("simulator:import-sample", async () => {
    return linkSourceDirectory(sampleSourceRoot);
  });

  ipcMain.handle("simulator:get-project-info", async () => {
    return readProjectInfo();
  });

  ipcMain.handle("simulator:get-api-state", async () => ({
    running: simulationApi.isRunning(),
  }));

  ipcMain.handle("simulator:get-settings", async () => {
    try {
      const content = await fs.readFile(settingsConfigPath, "utf8");
      return { ok: true, settings: normalizeSimulationSettings(JSON.parse(content)) };
    } catch (error) {
      if (error.code === "ENOENT") return { ok: true, settings: defaultSimulationSettings() };
      return { ok: false, error: `Unable to read hardware settings: ${error.message}` };
    }
  });

  ipcMain.handle("simulator:save-settings", async (_event, value) => {
    try {
      const settings = normalizeSimulationSettings(value);
      const properties = [
        `field.widthIn=${settings.fieldWidthIn}`,
        `field.lengthIn=${settings.fieldLengthIn}`,
        `robot.widthCm=${settings.robotWidthCm}`,
        `robot.lengthCm=${settings.robotLengthCm}`,
        `motor.default.maxRpm=${settings.motorDefaults.maxRpm}`,
        `motor.default.gearRatio=${settings.motorDefaults.gearRatio}`,
        `motor.default.wheelDiameterCm=${settings.motorDefaults.wheelDiameterCm}`,
        `motor.default.ticksPerRev=${settings.motorDefaults.ticksPerRev}`,
        `motor.count=${Object.keys(settings.motors).length}`,
      ];
      Object.entries(settings.motors).forEach(([name, profile], index) => {
        properties.push(
          `motor.${index}.name=${name}`,
          `motor.${index}.maxRpm=${profile.maxRpm}`,
          `motor.${index}.gearRatio=${profile.gearRatio}`,
          `motor.${index}.wheelDiameterCm=${profile.wheelDiameterCm}`,
          `motor.${index}.ticksPerRev=${profile.ticksPerRev}`,
        );
      });
      properties.push(`sensor.count=${settings.sensors.length}`);
      settings.sensors.forEach((sensor, index) => {
        properties.push(
          `sensor.${index}.name=${sensor.name}`,
          `sensor.${index}.type=${sensor.type}`,
          `sensor.${index}.direction=${sensor.direction}`,
        );
      });
      await fs.mkdir(simulatorRoot, { recursive: true });
      await fs.writeFile(settingsConfigPath, JSON.stringify(settings, null, 2), "utf8");
      await fs.writeFile(settingsPropertiesPath, properties.join("\n") + "\n", "utf8");
      return { ok: true, settings };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("simulator:compile-project", async () => {
    try {
      const { projectRoot, sources } = await resolveProjectSources();
      const jdk = locateJdk();
      const sdkFiles = walkJavaFiles(sdkSourceRoot);
      await fs.rm(compiledSdkRoot, { recursive: true, force: true });
      await fs.rm(classRoot, { recursive: true, force: true });
      await fs.mkdir(compiledSdkRoot, { recursive: true });
      await fs.mkdir(classRoot, { recursive: true });
      const sdkCompile = await compileJava(jdk.javac, [
        "--release", "8", "-Xlint:-options", "-encoding", "UTF-8", "-d", compiledSdkRoot, ...sdkFiles,
      ], simulatorRoot, simulatorRoot, 60000);
      if (sdkCompile.code !== 0) {
        throw new Error(`FTC simulator SDK compile failed:\n${sdkCompile.stderr || sdkCompile.stdout}`);
      }
      const userCompile = await compileJava(jdk.javac, [
        "--release", "8",
        "-Xlint:-options",
        "-encoding", "UTF-8",
        "-classpath", compiledSdkRoot,
        "-d", classRoot,
        ...sources,
      ], simulatorRoot, projectRoot, 60000);
      if (userCompile.code !== 0) {
        throw new Error(`Java project compile failed:\n${userCompile.stderr || userCompile.stdout}`);
      }

      const runner = await runCommand(jdk.java, [
        "-cp", `${compiledSdkRoot}${path.delimiter}${classRoot}`,
        "org.raaybots.sim.SimulatorRunner",
        "list",
      ], { cwd: projectRoot, timeoutMs: 30000 });
      if (runner.code !== 0) {
        throw new Error(`Unable to inspect compiled OpModes:\n${runner.stderr || runner.stdout}`);
      }
      const result = JSON.parse(runner.stdout.trim());
      compiledFileCount = sources.length;
      compiledProjectRoot = projectRoot;
      return {
        ok: true,
        files: sources.length,
        opModes: result.opModes ?? [],
        projectPath: projectRoot,
        projectName: path.basename(projectRoot),
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("simulator:run-opmode", async (_event, className) => {
    if (simulatorProcess && simulatorProcess.exitCode === null) {
      return { ok: false, error: "Stop the running OpMode before starting another." };
    }
    if (!isSafeClassName(className)) {
      return { ok: false, error: "Invalid OpMode class name." };
    }
    if (!compiledProjectRoot || compiledFileCount === 0) {
      return { ok: false, error: "Compile the linked Java project before running an OpMode." };
    }

    const consent = await dialog.showMessageBox({
      type: "warning",
      title: "Run imported Java code?",
      message: `Run ${className} in the FTC hardware simulator?`,
      detail: "Java code runs as your Windows user and is not sandboxed. Only run code you trust.",
      buttons: ["Run OpMode", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (consent.response !== 0) return { ok: false, error: "Run cancelled." };

    try {
      await simulationApi.start();
      const jdk = locateJdk();
      const child = spawn(jdk.java, [
        "-cp", `${compiledSdkRoot}${path.delimiter}${classRoot}`,
        "org.raaybots.sim.SimulatorRunner",
        "run",
        className,
        settingsPropertiesPath,
      ], { cwd: compiledProjectRoot, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      simulatorProcess = child;
      let stdoutBuffer = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) emitOutput(line);
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => emitOutput(JSON.stringify({
        event: "console",
        level: "error",
        message: chunk,
      })));
      child.once("error", (error) => {
        emitOutput(JSON.stringify({ event: "error", message: error.message }));
        void simulationApi.stop();
      });
      child.once("close", (code, signal) => {
        if (stdoutBuffer) emitOutput(stdoutBuffer);
        if (simulatorProcess === child) simulatorProcess = null;
        emitOutput(JSON.stringify({ event: "stopped", code, signal }));
        void simulationApi.stop();
      });
      return { ok: true, files: compiledFileCount };
    } catch (error) {
      await simulationApi.stop();
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("simulator:stop", async () => {
    await stopProcess();
    return { ok: true };
  });

  ipcMain.on("simulator:gamepad", (_event, gamepad, state) => {
    if (!simulatorProcess || simulatorProcess.exitCode !== null) return;
    if ((gamepad !== 1 && gamepad !== 2) || !state || typeof state !== "object") return;
    if (simulatorProcess.stdin.writable) {
      simulatorProcess.stdin.write(`${JSON.stringify({ type: "gamepad", gamepad, state })}\n`);
    }
  });

  app.on("before-quit", (event) => {
    if (!simulatorProcess) return;
    event.preventDefault();
    if (simulatorShutdownStarted) return;
    simulatorShutdownStarted = true;
    void stopProcess().finally(() => {
      simulatorShutdownStarted = false;
      app.quit();
    });
  });
}

module.exports = {
  registerSimulator,
  walkJavaFiles,
  isSafeClassName,
  defaultSimulationSettings,
  normalizeSimulationSettings,
};
