export type TelemetryValue = string | number | boolean | null;
export type TelemetryTree = { [key: string]: TelemetryTree | TelemetryValue };

export interface DashboardWidget {
  type: string;
  source: string;
  label?: string;
  unit?: string;
}

export interface DashboardDefinition {
  name: string;
  widgets: DashboardWidget[];
}

export interface TelemetryPoint {
  timestamp: number;
  value: number;
}

export interface LogRecord {
  sequence: number;
  timestamp: number;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | string;
  message: string;
  component?: string;
}

export type ConnectionState = "checking" | "connected" | "disconnected";

export type RobotControllerType = "control-hub" | "phone" | "other";

export interface RobotProfile {
  id: string;
  name: string;
  controllerType: RobotControllerType;
  telemetryUrl: string;
  onBotUrl: string;
}

export interface CommandResult {
  type: "command_result";
  ok: boolean;
  command?: string;
  result?: unknown;
  error?: string;
}
