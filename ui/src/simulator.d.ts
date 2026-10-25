import type { DashboardDefinition } from "./types";

export interface SimGamepadState {
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  leftTrigger: number;
  rightTrigger: number;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  leftBumper: boolean;
  rightBumper: boolean;
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  start: boolean;
  back: boolean;
}

export interface MotorProfile {
  maxRpm: number;
  gearRatio: number;
  wheelDiameterCm: number;
  ticksPerRev: number;
}

export interface SimSensorProfile {
  name: string;
  type: "distance" | "color" | "analog" | "digital" | "touch" | "voltage";
  direction: "front" | "back" | "left" | "right" | "down";
}

export interface SimulationSettings {
  fieldWidthIn: number;
  fieldLengthIn: number;
  robotWidthCm: number;
  robotLengthCm: number;
  motorDefaults: MotorProfile;
  motors: Record<string, MotorProfile>;
  sensors: SimSensorProfile[];
}

export interface SimulatorBridge {
  importProject: () => Promise<{ ok: boolean; files?: number; projectPath?: string; projectName?: string; error?: string }>;
  importSample: () => Promise<{ ok: boolean; files?: number; projectPath?: string; projectName?: string; error?: string }>;
  getProjectInfo: () => Promise<{ ok: boolean; files: number; projectPath?: string; projectName?: string; error?: string }>;
  getSettings: () => Promise<{ ok: boolean; settings?: SimulationSettings; error?: string }>;
  saveSettings: (settings: SimulationSettings) => Promise<{ ok: boolean; settings?: SimulationSettings; error?: string }>;
  compileProject: () => Promise<{
    ok: boolean;
    opModes?: Array<{ className: string; name: string; kind: string }>;
    files?: number;
    projectPath?: string;
    projectName?: string;
    error?: string;
  }>;
  runOpMode: (className: string) => Promise<{ ok: boolean; error?: string }>;
  stop: () => Promise<{ ok: boolean; error?: string }>;
  getApiState: () => Promise<{ running: boolean }>;
  onApiState: (callback: (state: { running: boolean }) => void) => () => void;
  setGamepad: (gamepad: number, state: SimGamepadState) => void;
  onOutput: (callback: (line: string) => void) => () => void;
}

declare global {
  interface Window {
    fieldTelemetrySimulator?: SimulatorBridge;
    fieldTelemetryDesktop?: FieldTelemetryDesktopBridge;
  }
}

export interface FieldTelemetryDesktopBridge {
  requestRobotApi: <T>(baseUrl: string, endpoint: string) => Promise<T>;
  startOnBotEmulator: () => Promise<{ running: boolean; origin: string }>;
  stopOnBotEmulator: () => Promise<{ running: boolean }>;
  checkOnBotJava: (baseUrl: string) => Promise<{
    connected: boolean;
    sourceFiles: number;
    sourcePaths: string[] | null;
    allowExternalLibraries: boolean;
  }>;
  uploadOnBotJava: (
    baseUrl: string,
    filename: string,
    source: string,
  ) => Promise<{ uploaded: boolean; filename: string; response: string }>;
  buildOnBotJava: (baseUrl: string) => Promise<{
    completed: boolean;
    outcome: "success" | "failure" | "unknown";
    log: string;
  }>;
  selectRobotProject: () => Promise<{
    canceled?: boolean;
    projectPath: string;
    projectName: string;
    files: Array<{ relativePath: string; source: string }>;
  } | null>;
  loadRobotProject: () => Promise<{
    projectPath: string;
    projectName: string;
    files: Array<{ relativePath: string; source: string }>;
  } | null>;
  saveRobotProjectSource: (
    relativePath: string,
    source: string,
    expectedSource?: string,
  ) => Promise<{
    saved: boolean;
    conflict: boolean;
    diskSource?: string;
    relativePath?: string;
  }>;
  loadDashboards: () => Promise<DashboardDefinition[]>;
  saveMeasurement: (
    suggestedName: string,
    contents: string,
  ) => Promise<{ saved: boolean; filename?: string }>;
  loadMeasurement: () => Promise<{ filename: string; value: unknown } | null>;
}
