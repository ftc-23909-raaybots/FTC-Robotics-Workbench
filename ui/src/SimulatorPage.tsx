import {
  Cpu,
  FolderOpen,
  Gamepad2,
  Keyboard,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MotorProfile, SimGamepadState, SimSensorProfile, SimulationSettings } from "./simulator";

interface OpModeEntry {
  className: string;
  name: string;
  kind: string;
}

interface SimulatorFrame {
  event?: string;
  state?: string;
  opMode?: string;
  message?: string;
  data?: {
    simulator?: {
      opmode?: string;
      time?: number;
      pose?: { x?: number; y?: number; heading?: number };
      field?: { widthIn: number; lengthIn: number; robotWidthCm: number; robotLengthCm: number };
      motors?: Record<string, {
        power: number;
        position: number;
        velocity: number;
        maxRpm: number;
        gearRatio: number;
        wheelDiameterCm: number;
      }>;
      servos?: Record<string, number>;
      sensors?: Record<string, Record<string, number | boolean | string>>;
      telemetry?: Record<string, unknown>;
    };
  };
}

interface TelemetryScreenItem {
  type: "line" | "data";
  caption: string;
  value: unknown;
}

interface TelemetryScreenFrame {
  opmode: string;
  time: number;
  items: TelemetryScreenItem[];
  log: string[];
}

const idleGamepad: SimGamepadState = {
  leftStickX: 0, leftStickY: 0, rightStickX: 0, rightStickY: 0,
  leftTrigger: 0, rightTrigger: 0,
  a: false, b: false, x: false, y: false,
  leftBumper: false, rightBumper: false,
  dpadUp: false, dpadDown: false, dpadLeft: false, dpadRight: false,
  start: false, back: false,
};

const defaultSimulationSettings: SimulationSettings = {
  fieldWidthIn: 144,
  fieldLengthIn: 144,
  robotWidthCm: 40,
  robotLengthCm: 37,
  motorDefaults: { maxRpm: 6000, gearRatio: 19.2, wheelDiameterCm: 9.6, ticksPerRev: 28 },
  motors: {},
  sensors: [],
};

function MotorProfileFields({
  profile,
  onChange,
}: {
  profile: MotorProfile;
  onChange: (key: keyof MotorProfile, value: number) => void;
}) {
  return (
    <div className="simulator-config-grid simulator-config-grid-four">
      <label>FREE RPM
        <input type="number" min="100" max="20000" step="50" value={profile.maxRpm}
          onChange={(event) => onChange("maxRpm", Number(event.target.value))} />
      </label>
      <label>GEAR RATIO
        <input type="number" min="0.1" max="200" step="0.1" value={profile.gearRatio}
          onChange={(event) => onChange("gearRatio", Number(event.target.value))} />
      </label>
      <label>WHEEL Ø CM
        <input type="number" min="1" max="30" step="0.1" value={profile.wheelDiameterCm}
          onChange={(event) => onChange("wheelDiameterCm", Number(event.target.value))} />
      </label>
      <label>TICKS / REV
        <input type="number" min="1" max="10000" step="1" value={profile.ticksPerRev}
          onChange={(event) => onChange("ticksPerRev", Number(event.target.value))} />
      </label>
    </div>
  );
}

function sensorReading(reading?: Record<string, number | boolean | string>): string {
  if (!reading) return "WAITING";
  switch (reading.type) {
    case "DISTANCE":
      return `${(Number(reading.distanceMm) / 10).toFixed(1)} CM`;
    case "COLOR":
      return `R ${reading.red} / G ${reading.green} / B ${reading.blue}`;
    case "ANALOG":
    case "VOLTAGE":
      return `${Number(reading.voltage).toFixed(2)} V`;
    case "DIGITAL":
      return reading.state ? "ACTIVE" : "INACTIVE";
    case "TOUCH":
      return reading.pressed ? "PRESSED" : "RELEASED";
    case "IMU":
      return `${Number(reading.headingDeg).toFixed(1)}°`;
    default:
      return "NO READING";
  }
}

function gamepadState(gamepad: Gamepad): SimGamepadState {
  const button = (index: number) => gamepad.buttons[index]?.pressed ?? false;
  return {
    leftStickX: gamepad.axes[0] ?? 0,
    leftStickY: gamepad.axes[1] ?? 0,
    rightStickX: gamepad.axes[2] ?? 0,
    rightStickY: gamepad.axes[3] ?? 0,
    leftTrigger: gamepad.buttons[6]?.value ?? 0,
    rightTrigger: gamepad.buttons[7]?.value ?? 0,
    a: button(0), b: button(1), x: button(2), y: button(3),
    leftBumper: button(4), rightBumper: button(5),
    dpadUp: button(12), dpadDown: button(13),
    dpadLeft: button(14), dpadRight: button(15),
    start: button(9), back: button(8),
  };
}

function keyboardState(keys: Set<string>): SimGamepadState {
  return {
    ...idleGamepad,
    leftStickX: Number(keys.has("d")) - Number(keys.has("a")),
    leftStickY: Number(keys.has("s")) - Number(keys.has("w")),
    rightStickX: Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft")),
    rightStickY: Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp")),
    leftTrigger: Number(keys.has("q")),
    rightTrigger: Number(keys.has("e")),
    a: keys.has(" "),
    b: keys.has("Shift"),
    x: keys.has("j"),
    y: keys.has("k"),
    leftBumper: keys.has("u"),
    rightBumper: keys.has("o"),
    dpadUp: keys.has("i"),
    dpadDown: keys.has("m"),
    dpadLeft: keys.has("n"),
    dpadRight: keys.has(","),
    start: keys.has("Enter"),
    back: keys.has("Backspace"),
  };
}

export default function SimulatorPage() {
  const bridge = window.fieldTelemetrySimulator;
  const [modes, setModes] = useState<OpModeEntry[]>([]);
  const [selectedMode, setSelectedMode] = useState("");
  const [importedFiles, setImportedFiles] = useState(0);
  const [projectPath, setProjectPath] = useState("");
  const [isCompiled, setIsCompiled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Choose an FTC Java project folder to get started.");
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [frame, setFrame] = useState<SimulatorFrame["data"]>();
  const [telemetryScreen, setTelemetryScreen] = useState<TelemetryScreenFrame | null>(null);
  const [simulationSettings, setSimulationSettings] = useState(defaultSimulationSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [newMotorName, setNewMotorName] = useState("");
  const [newSensor, setNewSensor] = useState<SimSensorProfile>({
    name: "",
    type: "distance",
    direction: "front",
  });
  const [controllerName, setControllerName] = useState("Keyboard controls");
  const keyboardKeys = useRef(new Set<string>());
  const currentMode = useMemo(
    () => modes.find((mode) => mode.className === selectedMode),
    [modes, selectedMode],
  );

  const addConsole = useCallback((line: string) => {
    setConsoleLines((current) => [...current, line].slice(-80));
  }, []);

  const publishGamepad = useCallback((state: SimGamepadState) => {
    bridge?.setGamepad(1, state);
  }, [bridge]);

  useEffect(() => {
    if (!bridge) return;
    let disposed = false;
    void bridge.getProjectInfo().then((result) => {
      if (disposed) return;
      setImportedFiles(result.files);
      setProjectPath(result.projectPath ?? "");
      if (result.ok) {
        setStatus(`Linked project: ${result.projectPath}. Compile to find OpModes.`);
      } else {
        setStatus(result.error ?? "Choose an FTC Java project folder to get started.");
      }
    }).catch((error: unknown) => {
      if (!disposed) setStatus(error instanceof Error ? error.message : "Unable to load linked project.");
    });
    return () => {
      disposed = true;
    };
  }, [bridge]);

  useEffect(() => {
    if (!bridge) {
      setSettingsLoading(false);
      return;
    }
    let disposed = false;
    void bridge.getSettings().then((result) => {
      if (disposed) return;
      if (result.ok && result.settings) setSimulationSettings(result.settings);
      else setStatus(result.error ?? "Unable to load hardware settings.");
    }).catch((error: unknown) => {
      if (!disposed) setStatus(error instanceof Error ? error.message : "Unable to load hardware settings.");
    }).finally(() => {
      if (!disposed) setSettingsLoading(false);
    });
    return () => {
      disposed = true;
    };
  }, [bridge]);

  const saveSimulationSettings = async () => {
    if (!bridge) return;
    setSettingsSaving(true);
    try {
      const result = await bridge.saveSettings(simulationSettings);
      if (!result.ok || !result.settings) {
        setStatus(result.error ?? "Unable to save hardware settings.");
        return;
      }
      setSimulationSettings(result.settings);
      setStatus("Hardware and field settings saved. They apply the next time you run an OpMode.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save hardware settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateMotorDefaults = (key: keyof MotorProfile, value: number) => {
    setSimulationSettings((current) => ({
      ...current,
      motorDefaults: { ...current.motorDefaults, [key]: value },
    }));
  };

  const updateMotorProfile = (name: string, key: keyof MotorProfile, value: number) => {
    setSimulationSettings((current) => ({
      ...current,
      motors: {
        ...current.motors,
        [name]: { ...(current.motors[name] ?? current.motorDefaults), [key]: value },
      },
    }));
  };

  const addMotorProfile = () => {
    const name = newMotorName.trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,47}$/.test(name)) {
      setStatus("Motor names must start with a letter and contain only letters, numbers, '.', '_' or '-'.");
      return;
    }
    setSimulationSettings((current) => ({
      ...current,
      motors: { ...current.motors, [name]: { ...current.motorDefaults } },
    }));
    setNewMotorName("");
  };

  const addSensor = () => {
    const name = newSensor.name.trim();
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,47}$/.test(name)) {
      setStatus("Sensor names must start with a letter and contain only letters, numbers, '.', '_' or '-'.");
      return;
    }
    if (simulationSettings.sensors.some((sensor) => sensor.name === name)) {
      setStatus(`Sensor name is already configured: ${name}`);
      return;
    }
    setSimulationSettings((current) => ({
      ...current,
      sensors: [...current.sensors, { ...newSensor, name }],
    }));
    setNewSensor((current) => ({ ...current, name: "" }));
  };

  const importSource = async (
    importer: () => Promise<{ ok: boolean; files?: number; projectPath?: string; error?: string }>,
    prompt: string,
  ) => {
    if (!bridge) return;
    setBusy(true);
    setStatus(prompt);
    try {
      const result = await importer();
      if (!result.ok) {
        if (result.error !== "Import cancelled.") setStatus(result.error ?? "Unable to import source.");
        return;
      }
      setImportedFiles(result.files ?? 0);
      setProjectPath(result.projectPath ?? "");
      setIsCompiled(false);
      setModes([]);
      setSelectedMode("");
      setStatus(
        `Linked ${result.files ?? 0} Java source files at ${result.projectPath ?? "the selected folder"}. ` +
        "Source files stay in place. Compile to find OpModes.",
      );
      setConsoleLines([]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to import source.");
    } finally {
      setBusy(false);
    }
  };

  const compileProject = async () => {
    if (!bridge) return;
    setBusy(true);
    setStatus("Compiling source with the installed JDK...");
    addConsole(`[build] Compiling the FTC API shim and Java files in ${projectPath || "the linked project"}.`);
    try {
      const result = await bridge.compileProject();
      if (!result.ok) {
        setIsCompiled(false);
        setModes([]);
        setSelectedMode("");
        setStatus(result.error ?? "Compilation failed.");
        addConsole(result.error ?? "Compilation failed.");
        return;
      }
      const foundModes = result.opModes ?? [];
      setModes(foundModes);
      setSelectedMode(foundModes[0]?.className ?? "");
      setIsCompiled(true);
      setImportedFiles(result.files ?? importedFiles);
      setProjectPath(result.projectPath ?? projectPath);
      setStatus(foundModes.length
        ? `Compiled ${result.files ?? importedFiles} Java files from ${result.projectPath ?? projectPath}. Select an OpMode to run.`
        : "Compilation succeeded, but no enabled OpMode classes were found.");
      addConsole(`[build] Compile successful; found ${foundModes.length} OpMode(s).`);
    } catch (error) {
      setIsCompiled(false);
      setStatus(error instanceof Error ? error.message : "Compilation failed.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!bridge) return;
    const result = await bridge.stop();
    if (!result.ok) setStatus(result.error ?? "Unable to stop the simulator.");
  };

  const run = async () => {
    if (!bridge || !selectedMode) return;
    setBusy(true);
    setConsoleLines([]);
    setFrame(undefined);
    setTelemetryScreen(null);
    setStatus("Waiting for run confirmation...");
    try {
      const result = await bridge.runOpMode(selectedMode);
      if (!result.ok) {
        if (result.error !== "Run cancelled.") setStatus(result.error ?? "Unable to start OpMode.");
        return;
      }
      setRunning(true);
      setStatus(`Starting ${currentMode?.name ?? selectedMode}...`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start OpMode.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!bridge) return;
    return bridge.onOutput((line) => {
      let message: SimulatorFrame;
      try {
        message = JSON.parse(line) as SimulatorFrame;
      } catch {
        addConsole(line);
        return;
      }
      if (message.event === "telemetry_update" && message.data) {
        setFrame(message.data);
      } else if (message.event === "telemetry_screen" && message.data) {
        setTelemetryScreen(message.data as TelemetryScreenFrame);
      } else if (message.event === "status") {
        setRunning(message.state === "running");
        setStatus(`Running ${message.opMode ?? "OpMode"}`);
      } else if (message.event === "stopped") {
        setRunning(false);
        setStatus("OpMode stopped.");
      } else if (message.event === "error") {
        setStatus(message.message ?? "Java simulator reported an error.");
        addConsole(`[error] ${message.message ?? "Unknown Java error"}`);
      } else if (message.event === "console") {
        addConsole(message.message ?? line);
      } else {
        addConsole(line);
      }
    });
  }, [addConsole, bridge]);

  useEffect(() => {
    if (!running) {
      publishGamepad(idleGamepad);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        " ", "Shift", "q", "e", "j", "k", "u", "o", "i", "m", "n", ",",
        "Enter", "Backspace"].includes(key)) {
        event.preventDefault();
        keyboardKeys.current.add(key);
        publishGamepad(keyboardState(keyboardKeys.current));
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      keyboardKeys.current.delete(key);
      publishGamepad(keyboardState(keyboardKeys.current));
    };
    const onBlur = () => {
      keyboardKeys.current.clear();
      publishGamepad(idleGamepad);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    const poll = window.setInterval(() => {
      const selectedGamepad = Array.from(navigator.getGamepads?.() ?? []).find(
        (gamepad): gamepad is Gamepad => Boolean(gamepad?.connected),
      );
      if (selectedGamepad) {
        setControllerName(selectedGamepad.id);
        publishGamepad(gamepadState(selectedGamepad));
      } else {
        setControllerName("Keyboard controls");
        publishGamepad(keyboardState(keyboardKeys.current));
      }
    }, 50);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      keyboardKeys.current.clear();
      publishGamepad(idleGamepad);
    };
  }, [publishGamepad, running]);

  const pose = frame?.simulator?.pose;
  const motors = Object.entries(frame?.simulator?.motors ?? {});
  const servos = Object.entries(frame?.simulator?.servos ?? {});
  const sensors = Object.entries(frame?.simulator?.sensors ?? {});
  const fieldWidthIn = frame?.simulator?.field?.widthIn ?? simulationSettings.fieldWidthIn;
  const fieldLengthIn = frame?.simulator?.field?.lengthIn ?? simulationSettings.fieldLengthIn;
  const robotWidthCm = frame?.simulator?.field?.robotWidthCm ?? simulationSettings.robotWidthCm;
  const robotLengthCm = frame?.simulator?.field?.robotLengthCm ?? simulationSettings.robotLengthCm;
  return (
    <div className="simulator-page">
      {!bridge && (
        <div className="simulator-warning" role="status">
          The simulator is available in the installed desktop app. Install Robot Workbench to import and run projects.
        </div>
      )}
      <section className="simulator-banner">
        <div className="simulator-banner-copy">
          <span className="eyebrow">LOCAL FTC-STYLE SIMULATOR</span>
          <h2>Test OpModes without robot hardware.</h2>
          <p>Compile a Java project, configure simulated motors and sensors, then control the robot with your keyboard or a connected gamepad.</p>
          <div className="simulator-banner-actions">
            <button className="hard-button button-white" onClick={() => {
              if (bridge) void importSource(bridge.importProject, "Choose the root folder of your FTC Java project.");
            }} disabled={!bridge || busy || running}>
              <FolderOpen size={16} /> CHOOSE JAVA PROJECT
            </button>
            <button className="hard-button button-white" onClick={() => {
              if (bridge) void importSource(bridge.importSample, "Linking the bundled FTC sample project...");
            }} disabled={!bridge || busy || running}>
              <Cpu size={16} /> LOAD EXAMPLE PROJECT
            </button>
            <button className="hard-button button-black" onClick={() => void compileProject()} disabled={!bridge || busy || running || importedFiles === 0}>
              <Wrench size={16} /> COMPILE AND FIND OPMODES
            </button>
          </div>
        </div>
        <div className="simulator-stamp"><Cpu size={35} /><span>NO ANDROID<br />DEVICE NEEDED</span></div>
      </section>

      <div className="simulator-grid">
        <section className="panel simulator-run-panel">
          <header className="panel-header">
            <div><span className="eyebrow">OPMODE LAUNCHER</span><h2>Project & run</h2></div>
            <span className={`simulator-state ${running ? "simulator-state-live" : ""}`}>{running ? "RUNNING" : isCompiled ? "COMPILED" : "IDLE"}</span>
          </header>
          <div className="simulator-run-content">
            <div className="simulator-project-meta">
              <span>PROJECT SOURCE</span><strong>{importedFiles} <small>JAVA FILES</small></strong>
            </div>
            <code className="simulator-class-name" title={projectPath}>{projectPath || "No project folder selected"}</code>
            <label className="field-label" htmlFor="opmode-select">OPMODE</label>
            <select
              id="opmode-select"
              className="text-input"
              value={selectedMode}
              onChange={(event) => setSelectedMode(event.target.value)}
              disabled={!isCompiled || modes.length === 0 || running}
            >
              {modes.length === 0 && <option value="">Compile the project to find OpModes</option>}
              {modes.map((mode) => (
                <option key={mode.className} value={mode.className}>{mode.name} · {mode.kind}</option>
              ))}
            </select>
            <code className="simulator-class-name">{currentMode?.className ?? "Java package and class name"}</code>
            <div className="simulator-run-actions">
              <button className="hard-button button-red" onClick={() => void run()} disabled={!bridge || !isCompiled || !selectedMode || busy || running}>
                <Play size={16} fill="currentColor" /> RUN OPMODE
              </button>
              <button className="hard-button button-white" onClick={() => void stop()} disabled={!bridge || !running}>
                <Square size={15} fill="currentColor" /> STOP
              </button>
            </div>
            <p className="simulator-status" role="status">{status}</p>
            <p className="simulator-trust-note">For your safety, starting imported Java requires confirmation. Code runs as your Windows user and is not sandboxed—only run trusted source.</p>
          </div>
        </section>

        <section className="panel simulator-field-panel">
          <header className="panel-header">
            <div>            <span className="eyebrow">FIELD SIZE / {(fieldWidthIn / 12).toFixed(1)} × {(fieldLengthIn / 12).toFixed(1)} FT</span><h2>Robot field</h2></div>
            <span className="simulator-coordinate">{pose ? `${(pose.x ?? 0).toFixed(1)}, ${(pose.y ?? 0).toFixed(1)} IN` : "NOT RUNNING"}</span>
          </header>
          <div className="simulator-field-wrap">
            <div className="simulator-field" style={{ aspectRatio: `${fieldWidthIn} / ${fieldLengthIn}` }}>
              <div className="simulator-field-cross simulator-field-cross-x" />
              <div className="simulator-field-cross simulator-field-cross-y" />
              <div
                className="simulator-robot"
                style={{
                  left: `${Math.max(0, Math.min(100, 50 + (pose?.x ?? 0) / fieldWidthIn * 100))}%`,
                  top: `${Math.max(0, Math.min(100, 50 - (pose?.y ?? 0) / fieldLengthIn * 100))}%`,
                  width: `${robotWidthCm / (fieldWidthIn * 2.54) * 100}%`,
                  height: `${robotLengthCm / (fieldLengthIn * 2.54) * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${pose?.heading ?? 0}deg)`,
                }}
              >
                <span />
              </div>
              {!running && <div className="simulator-field-idle">SIMULATION<br />READY</div>}
            </div>
          </div>
          <div className="simulator-field-meta">
            <span>SIM TIME <strong>{(frame?.simulator?.time ?? 0).toFixed(1)} S</strong></span>
            <span>HEADING <strong>{(pose?.heading ?? 0).toFixed(1)}°</strong></span>
            <span>ROBOT SIZE <strong>{robotWidthCm} × {robotLengthCm} CM</strong></span>
            <span>TELEMETRY <strong>{frame ? "STREAMING" : "NO FRAME"}</strong></span>
          </div>
        </section>
      </div>

      <section className="panel simulator-telemetry-panel">
        <header className="panel-header">
          <div>
            <span className="eyebrow">FTC SDK / TELEMETRY.UPDATE()</span>
            <h2>OpMode telemetry display</h2>
          </div>
          <span className="simulator-telemetry-status">
            {telemetryScreen ? `${telemetryScreen.time.toFixed(2)} SEC / LIVE` : running ? "WAITING FOR TELEMETRY" : "NO OPMODE TELEMETRY"}
          </span>
        </header>
        <div className="simulator-telemetry-screen" role="log" aria-live="polite">
          {telemetryScreen?.items.length ? (
            telemetryScreen.items.map((item, index) => (
              item.type === "line" ? (
                <div className={`simulator-telemetry-line ${item.value === "" ? "telemetry-blank-line" : ""}`} key={`line-${index}`}>
                  {String(item.value ?? "")}
                </div>
              ) : (
                <div className="simulator-telemetry-data" key={`data-${index}`}>
                  <span>{item.caption}</span>
                  <strong>{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</strong>
                </div>
              )
            ))
          ) : (
            <div className="simulator-telemetry-empty">
              {running
                ? "The OpMode has not called telemetry.update() yet."
                : "Run an OpMode to see its telemetry.addData(), addLine(), and update() output here."}
            </div>
          )}
          {telemetryScreen?.log.map((line, index) => (
            <div className="simulator-telemetry-log" key={`log-${index}`}>{line}</div>
          ))}
        </div>
        <footer className="simulator-telemetry-footer">
          <span>OUTPUT FROM <strong>{telemetryScreen?.opmode ?? currentMode?.className ?? "SELECTED OPMODE"}</strong></span>
          <span>{telemetryScreen?.items.length ?? 0} ITEMS</span>
        </footer>
      </section>

      <div className="simulator-grid simulator-lower-grid">
        <section className="panel simulator-controls-panel">
          <header className="panel-header">
            <div><span className="eyebrow">GAMEPAD 1 INPUT</span><h2>Controller inputs</h2></div>
            <Gamepad2 size={22} strokeWidth={3} />
          </header>
          <div className="simulator-controller">
            <div className="controller-status"><Keyboard size={16} /><strong>{controllerName}</strong><span>{running ? "LIVE INPUT" : "INPUT STANDBY"}</span></div>
            <div className="controller-map">
              <div><kbd>W / S</kbd><span>GAMEPAD 1 / LEFT STICK Y / FORWARD</span></div>
              <div><kbd>A / D</kbd><span>GAMEPAD 1 / LEFT STICK X / MECANUM STRAFE</span></div>
              <div><kbd>← / →</kbd><span>GAMEPAD 1 / RIGHT STICK X / ROTATE</span></div>
              <div><kbd>Q / E</kbd><span>LEFT / RIGHT TRIGGER</span></div>
              <div><kbd>SPACE · J · K</kbd><span>A · X · Y BUTTONS</span></div>
              <div><kbd>U / O · I M N ,</kbd><span>BUMPERS / D-PAD</span></div>
            </div>
            <p>Connect a standard USB or Bluetooth controller and press a button to activate it. Keyboard input remains available without a gamepad.</p>
          </div>
        </section>

        <section className="panel simulator-hardware-panel">
          <header className="panel-header">
            <div><span className="eyebrow">EMULATED DEVICES</span><h2>Hardware map</h2></div>
            <button
              className="hard-button button-yellow simulator-settings-save"
              onClick={() => void saveSimulationSettings()}
              disabled={!bridge || settingsLoading || settingsSaving || running}
            >
              <Save size={14} /> {settingsSaving ? "SAVING..." : "SAVE SETUP"}
            </button>
          </header>
          <div className="simulator-hardware-settings">
            <div className="simulator-config-section">
              <h3>FIELD & ROBOT SCALE</h3>
              <div className="simulator-config-grid simulator-config-grid-four">
                <label>FIELD WIDTH (IN)
                  <input type="number" min="12" max="1000" step="1" value={simulationSettings.fieldWidthIn}
                    onChange={(event) => setSimulationSettings((current) => ({ ...current, fieldWidthIn: Number(event.target.value) }))} />
                </label>
                <label>FIELD LENGTH (IN)
                  <input type="number" min="12" max="1000" step="1" value={simulationSettings.fieldLengthIn}
                    onChange={(event) => setSimulationSettings((current) => ({ ...current, fieldLengthIn: Number(event.target.value) }))} />
                </label>
                <label>ROBOT WIDTH (CM)
                  <input type="number" min="5" max="200" step="0.5" value={simulationSettings.robotWidthCm}
                    onChange={(event) => setSimulationSettings((current) => ({ ...current, robotWidthCm: Number(event.target.value) }))} />
                </label>
                <label>ROBOT LENGTH (CM)
                  <input type="number" min="5" max="200" step="0.5" value={simulationSettings.robotLengthCm}
                    onChange={(event) => setSimulationSettings((current) => ({ ...current, robotLengthCm: Number(event.target.value) }))} />
                </label>
              </div>
              <p>The default FTC field is 144 × 144 in (12 × 12 ft), and the robot footprint is 40 × 37 cm. Position and sensor distances are measured in inches.</p>
            </div>

            <div className="simulator-config-section">
              <h3>DEFAULT MOTOR SETTINGS</h3>
              <div className="simulator-config-grid simulator-config-grid-four">
                <label>FREE SPEED (RPM)
                  <input type="number" min="100" max="20000" step="50" value={simulationSettings.motorDefaults.maxRpm}
                    onChange={(event) => updateMotorDefaults("maxRpm", Number(event.target.value))} />
                </label>
                <label>GEAR REDUCTION
                  <input type="number" min="0.1" max="200" step="0.1" value={simulationSettings.motorDefaults.gearRatio}
                    onChange={(event) => updateMotorDefaults("gearRatio", Number(event.target.value))} />
                </label>
                <label>WHEEL Ø (CM)
                  <input type="number" min="1" max="30" step="0.1" value={simulationSettings.motorDefaults.wheelDiameterCm}
                    onChange={(event) => updateMotorDefaults("wheelDiameterCm", Number(event.target.value))} />
                </label>
                <label>ENCODER TICKS / REV
                  <input type="number" min="1" max="10000" step="1" value={simulationSettings.motorDefaults.ticksPerRev}
                    onChange={(event) => updateMotorDefaults("ticksPerRev", Number(event.target.value))} />
                </label>
              </div>
              <p>Motor acceleration, encoder and wheel speed, and battery voltage are calculated from these settings. Add a motor profile to configure hardware with a different gear ratio.</p>
              <div className="simulator-add-device">
                <input aria-label="Motor profile name" placeholder="Motor name from hardwareMap" value={newMotorName}
                  onChange={(event) => setNewMotorName(event.target.value)} />
                <button className="hard-button button-white" onClick={addMotorProfile} disabled={running}>
                  <Plus size={14} /> ADD MOTOR PROFILE
                </button>
              </div>
              {Object.entries(simulationSettings.motors).map(([name, profile]) => (
                <div className="simulator-profile-card" key={`profile-${name}`}>
                  <div className="simulator-profile-title"><strong>{name}</strong><button type="button" title={`Remove ${name} override`}
                    onClick={() => setSimulationSettings((current) => {
                      const motors = { ...current.motors };
                      delete motors[name];
                      return { ...current, motors };
                    })}><Trash2 size={14} /></button></div>
                  <MotorProfileFields profile={profile} onChange={(key, value) => updateMotorProfile(name, key, value)} />
                </div>
              ))}
            </div>

            <div className="simulator-config-section">
              <h3>SIMULATED SENSORS</h3>
              <div className="simulator-add-device simulator-add-sensor">
                <input aria-label="Sensor hardwareMap name" placeholder="Sensor hardwareMap name" value={newSensor.name}
                  onChange={(event) => setNewSensor((current) => ({ ...current, name: event.target.value }))} />
                <select aria-label="Sensor type" value={newSensor.type}
                  onChange={(event) => setNewSensor((current) => ({ ...current, type: event.target.value as SimSensorProfile["type"] }))}>
                  <option value="distance">Distance</option><option value="color">Color</option>
                  <option value="analog">Analog input</option><option value="digital">Digital input</option>
                  <option value="touch">Touch sensor</option>
                  <option value="voltage">Battery voltage</option>
                </select>
                <select aria-label="Sensor direction" value={newSensor.direction}
                  onChange={(event) => setNewSensor((current) => ({ ...current, direction: event.target.value as SimSensorProfile["direction"] }))}>
                  <option value="front">Front</option><option value="back">Back</option>
                  <option value="left">Left</option><option value="right">Right</option><option value="down">Down</option>
                </select>
                <button className="hard-button button-white" onClick={addSensor} disabled={running}><Plus size={14} /> ADD</button>
              </div>
              <p>Use the same names as your OpMode hardwareMap. Distance readings use the field boundaries, color readings reflect the simulated floor, and voltage changes with motor load.</p>
              {simulationSettings.sensors.length ? (
                <div className="simulator-configured-sensors">
                  {simulationSettings.sensors.map((sensor) => {
                    const reading = frame?.simulator?.sensors?.[sensor.name];
                    return (
                      <div className="simulator-configured-sensor" key={`sensor-${sensor.name}`}>
                        <span><i className="device-indicator device-indicator-sensor" />{sensor.name}<small>{sensor.type.toUpperCase()} / {sensor.direction.toUpperCase()}</small></span>
                        <strong>{sensorReading(reading)}</strong>
                        <button type="button" title={`Remove ${sensor.name}`}
                          onClick={() => setSimulationSettings((current) => ({
                            ...current, sensors: current.sensors.filter((item) => item.name !== sensor.name),
                          }))}><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              ) :               <div className="simulator-device-empty simulator-device-empty-compact">Add sensors here to make them available through your OpMode hardwareMap.</div>}
            </div>

            <div className="simulator-config-section">
              <h3>LIVE HARDWARE READINGS</h3>
              {motors.length || servos.length || sensors.length ? (
                <div className="simulator-device-list">
                  {motors.map(([name, motor]) => (
                    <div className="simulator-device-row" key={`motor-${name}`}>
                      <span><i className="device-indicator" />{name}<small>DC MOTOR</small></span>
                      <strong>{motor.power.toFixed(2)} PWR</strong><strong>{motor.position} TICKS</strong>
                      <small>{motor.maxRpm.toFixed(0)} RPM / {motor.gearRatio}:1</small>
                    </div>
                  ))}
                  {servos.map(([name, position]) => (
                    <div className="simulator-device-row" key={`servo-${name}`}>
                      <span><i className="device-indicator device-indicator-servo" />{name}<small>SERVO</small></span>
                      <strong>{position.toFixed(2)} POS</strong>
                    </div>
                  ))}
                  {sensors.map(([name, reading]) => (
                    <div className="simulator-device-row simulator-sensor-reading" key={`sensor-reading-${name}`}>
                      <span><i className="device-indicator device-indicator-sensor" />{name}<small>{String(reading.type ?? "SENSOR")}</small></span>
                      <strong>{sensorReading(reading)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="simulator-device-empty"><Cpu size={25} /><span>Hardware appears here as your OpMode requests it with hardwareMap.get(...). Configured sensors are available when the next OpMode starts.</span></div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel simulator-console-panel">
        <header className="panel-header">
          <div><span className="eyebrow">JAVAC / OPMODE OUTPUT</span><h2>Simulator console</h2></div>
          <span className="simulator-console-target">LOCAL SIMULATION</span>
        </header>
        <div className="simulator-console" role="log" aria-live="polite">
          {consoleLines.length ? consoleLines.map((line, index) => <code key={`${index}-${line}`}>{line}</code>) : (
            <span>Import a Java project and compile it to see diagnostics. Simulation telemetry is available only on this computer while an OpMode runs.</span>
          )}
        </div>
      </section>
    </div>
  );
}
