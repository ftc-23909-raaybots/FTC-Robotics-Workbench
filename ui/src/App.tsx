import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Battery,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Command,
  Copy,
  Cpu,
  Gauge,
  LayoutDashboard,
  PlugZap,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  TerminalSquare,
  X,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { dashboardDefinitions as bundledDashboardDefinitions } from "./dashboards";
import SimulatorPage from "./SimulatorPage";
import SettingsPage from "./SettingsPage";

import { backendBaseUrl, useTelemetry } from "./telemetry";
import type {
  ConnectionState,
  DashboardDefinition,
  LogRecord,
  RobotProfile,
  TelemetryPoint,
  TelemetryTree,
} from "./types";
import {
  DEFAULT_ONBOT_URL,
  DEFAULT_TELEMETRY_URL,
  normalizeRobotOrigin,
  persistRobotProfileState,
  readRobotProfileState,
} from "./robotProfiles";
import { DEFAULT_THEME_ID, readThemeId } from "./themes";

const RobotCodePage = lazy(() => import("./RobotCodePage"));
type Section = "management" | "dashboard" | "telemetry" | "measurements" | "simulator" | "code" | "logs" | "settings";
const MAX_CAPTURED_FRAMES = 3000;

const navigation: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: "management", label: "Robot management", icon: Cpu },
  { id: "dashboard", label: "Telemetry dashboard", icon: LayoutDashboard },
  { id: "telemetry", label: "Telemetry", icon: Activity },
  { id: "measurements", label: "Measurements", icon: Gauge },
  { id: "simulator", label: "Simulator", icon: Cpu },
  { id: "code", label: "Robot code", icon: Code2 },
  { id: "logs", label: "System logs", icon: TerminalSquare },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const connectionLabels: Record<ConnectionState, string> = {
  checking: "Checking robot",
  connected: "Robot connected",
  disconnected: "Robot disconnected",
};

function getValue(tree: TelemetryTree, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, tree);
}

function flattenTree(tree: TelemetryTree, prefix = ""): Array<[string, unknown]> {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenTree(value as TelemetryTree, path)
      : [[path, value] as [string, unknown]];
  });
}

function displayValue(value: unknown, unit = ""): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return String(value);
}

function shortTime(timestamp: number | null): string {
  if (timestamp === null) return "WAITING FOR DATA";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`eyebrow ${className}`}>{children}</span>;
}

function StatusPill({
  state,
  simulationActive,
}: {
  state: ConnectionState;
  simulationActive: boolean;
}) {
  const label = simulationActive
    ? state === "connected"
      ? "Simulation connected"
      : state === "checking"
        ? "Checking simulation"
        : "Simulation telemetry unavailable"
    : connectionLabels[state];
  return (
    <span className={`status-pill status-${state}`} role="status">
      <span className="status-dot" />
      {label}
    </span>
  );
}

function HardButton({
  children,
  onClick,
  variant = "yellow",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "yellow" | "red" | "white" | "black";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={`hard-button button-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function Panel({
  children,
  className = "",
  title,
  eyebrow,
  accent = "violet",
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  accent?: "violet" | "yellow" | "red" | "cream" | "black";
  action?: React.ReactNode;
}) {
  return (
    <section className={`panel panel-${accent} ${className}`}>
      {title && (
        <header className="panel-header">
          <div>
            {eyebrow && <Label>{eyebrow}</Label>}
            <h2>{title}</h2>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Sparkline({
  points,
  color = "var(--ink)",
  height = 110,
  label,
}: {
  points: TelemetryPoint[];
  color?: string;
  height?: number;
  label: string;
}) {
  const width = 520;
  const values = points.map((point) => point.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;
  const coordinates = values.map((value, index) => {
    const x = values.length < 2 ? width : (index / (values.length - 1)) * width;
    const y = height - 10 - ((value - min) / range) * (height - 20);
    return [x, y] as const;
  });
  const path = coordinates.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = coordinates.length
    ? `${path} L${width},${height} L0,${height} Z`
    : "";
  const latest = points.at(-1)?.value;
  const previous = points.at(-2)?.value;
  const trend = latest !== undefined && previous !== undefined ? latest - previous : 0;

  return (
    <div className="sparkline-wrap">
      <div className="chart-captions">
        <span>{points.length} SAMPLES</span>
        <span className="chart-range">
          {values.length ? `${min.toFixed(1)} — ${max.toFixed(1)}` : "WAITING FOR SIGNAL"}
        </span>
      </div>
      <svg
        className="sparkline"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} trend`}
      >
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            className="chart-gridline"
          />
        ))}
        {area && <path d={area} fill={color} className="chart-area" />}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="chart-footer">
        <span>10 HZ POLL</span>
        <span className="trend-readout">
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend >= 0 ? "+" : ""}
          {trend.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  color = "yellow",
  note,
}: {
  label: string;
  value: unknown;
  unit?: string;
  icon: typeof Battery;
  color?: "yellow" | "red" | "violet";
  note?: string;
}) {
  return (
    <article className={`metric-card metric-${color}`}>
      <div className="metric-topline">
        <Label>{label}</Label>
        <span className="metric-icon"><Icon size={19} strokeWidth={3} /></span>
      </div>
      <strong className="metric-value">{displayValue(value, unit)}</strong>
      <span className="metric-note">{note ?? "LIVE TELEMETRY"}</span>
    </article>
  );
}

function DashboardWidgetCard({
  widget,
  snapshot,
  history,
  index,
}: {
  widget: DashboardDefinition["widgets"][number];
  snapshot: TelemetryTree;
  history: TelemetryPoint[];
  index: number;
}) {
  const value = getValue(snapshot, widget.source);
  const title = widget.label || widget.source.split(".").at(-1)?.replaceAll("_", " ") || widget.source;
  const isGraph = widget.type.toLowerCase() === "graph" || widget.type.toLowerCase() === "chart";
  const color = index % 3 === 0 ? "red" : index % 3 === 1 ? "violet" : "yellow";

  return (
    <Panel
      className={`widget-card ${isGraph ? "widget-graph" : "widget-value"}`}
      accent={color}
      eyebrow={`SOURCE / ${widget.source}`}
      title={title}
      action={<span className="widget-type">{widget.type.toUpperCase()}</span>}
    >
      {isGraph ? (
        <Sparkline points={history} label={title} />
      ) : (
        <div className="widget-value-readout">
          <strong>{displayValue(value, widget.unit)}</strong>
          <span>{value === undefined ? "AWAITING FIRST SAMPLE" : "CURRENT VALUE"}</span>
        </div>
      )}
    </Panel>
  );
}

function TelemetryBranch({
  tree,
  prefix,
  filter,
  selectedPath,
  onSelect,
  copyPath,
}: {
  tree: TelemetryTree;
  prefix: string;
  filter: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  copyPath: (path: string) => void;
}) {
  return (
    <div className="tree-branch">
      {Object.entries(tree)
        .filter(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          return (
            path.toLowerCase().includes(filter.toLowerCase()) ||
            (value !== null &&
              typeof value === "object" &&
              flattenTree(value as TelemetryTree, path).some(([child]) =>
                child.toLowerCase().includes(filter.toLowerCase()),
              ))
          );
        })
        .map(([key, value]) => {
          const path = prefix ? `${prefix}.${key}` : key;
          const isBranch = value !== null && typeof value === "object";
          return isBranch ? (
            <details className="tree-group" key={path} open>
              <summary><ChevronRight size={16} strokeWidth={3} /> {key}</summary>
              <TelemetryBranch
                tree={value as TelemetryTree}
                prefix={path}
                filter={filter}
                selectedPath={selectedPath}
                onSelect={onSelect}
                copyPath={copyPath}
              />
            </details>
          ) : (
            <TelemetryLeaf
              key={path}
              path={path}
              value={value}
              selected={selectedPath === path}
              onSelect={onSelect}
              copyPath={copyPath}
            />
          );
        })}
    </div>
  );
}

function TelemetryLeaf({
  path,
  value,
  selected,
  onSelect,
  copyPath,
}: {
  path: string;
  value: unknown;
  selected: boolean;
  onSelect: (path: string) => void;
  copyPath: (path: string) => void;
}) {
  const type = value === null ? "NULL" : typeof value;
  return (
    <div className={`tree-leaf ${selected ? "tree-leaf-selected" : ""}`}>
      <button className="tree-path" onClick={() => onSelect(path)} aria-label={`Inspect ${path}`}>
        <code title={path}>{path}</code>
      </button>
      <span className={`type-tag type-${type}`}>{type}</span>
      <strong title={String(value)}>{displayValue(value)}</strong>
      <button
        className="tree-copy"
        onClick={() => copyPath(path)}
        aria-label={`Copy ${path} to clipboard`}
        title="Copy signal path"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

function LogRow({ record }: { record: LogRecord }) {
  const level = record.level.toLowerCase();
  return (
    <article className="log-row">
      <time dateTime={new Date(record.timestamp).toISOString()}>{shortTime(record.timestamp)}</time>
      <span className={`log-level level-${level}`}>{record.level}</span>
      <p>{record.message}</p>
      <span className="log-sequence">#{record.sequence}</span>
    </article>
  );
}

function SettingsDialog({
  initialUrl,
  onClose,
  onSave,
}: {
  initialUrl: string;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [value, setValue] = useState(initialUrl);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="dialog-header">
          <div className="dialog-icon"><Settings2 size={24} strokeWidth={3} /></div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings"><X /></button>
        </header>
        <Label>CONNECTION SETTINGS</Label>
        <h2 id="settings-title">Connect to a robot.</h2>
        <p>Enter the address of the telemetry API running on your robot.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          onSave(value.trim());
        }}>
          <label className="field-label" htmlFor="backend-url">ROBOT API ADDRESS</label>
          <input
            id="backend-url"
            className="text-input"
            type="url"
            inputMode="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="http://192.168.43.1:8765"
            required
          />
          <div className="dialog-actions">
            <HardButton variant="white" onClick={() => onSave("")}>RESET DEFAULT</HardButton>
            <HardButton type="submit" variant="red">SAVE CONNECTION</HardButton>
          </div>
        </form>
        <p className="dialog-footnote">Default: Control Hub at 192.168.43.1:8765. This app only reads telemetry and logs.</p>
      </section>
    </div>
  );
}

function RobotManagementPage({
  profile,
  connection,
  apiReachable,
  robotConnected,
  lastUpdate,
  signalCount,
  logs,
  simulationActive,
  onNavigate,
}: {
  profile: RobotProfile;
  connection: ConnectionState;
  apiReachable: boolean;
  robotConnected: boolean;
  lastUpdate: number | null;
  signalCount: number;
  logs: LogRecord[];
  simulationActive: boolean;
  onNavigate: (section: Section) => void;
}) {
  const [onBotCheck, setOnBotCheck] = useState<{
    url: string;
    state: "idle" | "checking" | "connected" | "failed";
    sourceFiles?: number;
    message?: string;
  }>({ url: profile.onBotUrl, state: "idle" });
  const status = simulationActive
    ? robotConnected ? "SIMULATION LIVE" : "SIMULATOR NOT REPORTING"
    : robotConnected ? "ROBOT ONLINE" : connection === "checking" ? "CHECKING ROBOT" : "ROBOT OFFLINE";

  useEffect(() => {
    setOnBotCheck({ url: profile.onBotUrl, state: "idle" });
  }, [profile.onBotUrl]);

  const checkProgramAndManage = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) return;
    setOnBotCheck({ url: profile.onBotUrl, state: "checking" });
    try {
      const result = await desktop.checkOnBotJava(profile.onBotUrl);
      setOnBotCheck({
        url: profile.onBotUrl,
        state: result.connected ? "connected" : "failed",
        sourceFiles: result.sourceFiles,
        message: result.connected ? undefined : "The OnBotJava file endpoint was not available.",
      });
    } catch (error) {
      setOnBotCheck({
        url: profile.onBotUrl,
        state: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const activeOnBotCheck = onBotCheck.url === profile.onBotUrl
    ? onBotCheck
    : { url: profile.onBotUrl, state: "idle" as const };
  const recentErrors = logs.filter((record) => record.level.toUpperCase() === "ERROR").length;

  return (
    <div className="robot-management-home">
      <section className="robot-management-hero panel">
        <div className="robot-management-hero-copy">
          <Label>ACTIVE ROBOT · {profile.controllerType.replaceAll("-", " ").toUpperCase()}</Label>
          <h2>{profile.name}</h2>
          <p>
            Manage robot code, review live system data, and prepare a simulation
            from one workspace.
          </p>
          <div className={`robot-management-status ${robotConnected ? "management-status-online" : ""}`}>
            <span />
            <strong>{status}</strong>
            <small>
              {simulationActive
                ? "Local simulator telemetry"
                : apiReachable
                  ? "Robot telemetry API is responding"
                  : "Connect to the robot Wi-Fi to access management tools"}
            </small>
          </div>
        </div>
        <div className="robot-management-primary-actions">
          <HardButton onClick={() => onNavigate("code")} variant="yellow">
            <Code2 size={17} /> OPEN ROBOT CODE
          </HardButton>
          <HardButton onClick={() => onNavigate("telemetry")} variant="white">
            <Activity size={17} /> LIVE TELEMETRY
          </HardButton>
        </div>
      </section>

      <div className="robot-management-tools">
        <button className="robot-management-tool panel" onClick={() => onNavigate("code")}>
          <span className="management-tool-icon"><Code2 size={21} /></span>
          <span className="eyebrow">PROJECT &amp; DEPLOYMENT</span>
          <strong>Robot code</strong>
          <small>Open a Java project, edit source, upload to OnBotJava, and build on the controller.</small>
          <span className="management-tool-link">OPEN WORKSPACE <ChevronRight size={15} /></span>
        </button>
        <button className="robot-management-tool panel" onClick={() => onNavigate("telemetry")}>
          <span className="management-tool-icon"><Activity size={21} /></span>
          <span className="eyebrow">LIVE SYSTEM DATA</span>
          <strong>Telemetry</strong>
          <small>Inspect robot signals and recent measurements from the active telemetry API.</small>
          <span className="management-tool-link">VIEW TELEMETRY <ChevronRight size={15} /></span>
        </button>
        <button className="robot-management-tool panel" onClick={() => onNavigate("simulator")}>
          <span className="management-tool-icon"><Cpu size={21} /></span>
          <span className="eyebrow">LOCAL TESTING</span>
          <strong>Simulator</strong>
          <small>Compile and run FTC-style OpModes with simulated controls, motors, and sensors.</small>
          <span className="management-tool-link">OPEN SIMULATOR <ChevronRight size={15} /></span>
        </button>
      </div>

      <section className="robot-management-details panel">
        <header className="panel-header">
          <div><Label>CONNECTION PROFILE</Label><h2>{profile.name}</h2></div>
          <span className={`management-api-tag ${apiReachable ? "management-api-live" : ""}`}>
            {apiReachable ? "API RESPONDING" : "API NOT REACHED"}
          </span>
        </header>
        <div className="robot-management-addresses">
          <div><span className="eyebrow">TELEMETRY API</span><strong>{profile.telemetryUrl}</strong></div>
          <div><span className="eyebrow">PROGRAM &amp; MANAGE</span><strong>{profile.onBotUrl}</strong></div>
          <div><span className="eyebrow">LAST TELEMETRY UPDATE</span><strong>{shortTime(lastUpdate)}</strong></div>
        </div>
        <div className="management-onbot-check">
          <div role="status" aria-live="polite">
            <span className="eyebrow">PROGRAM &amp; MANAGE STATUS</span>
            <strong>
              {activeOnBotCheck.state === "checking"
                ? "CHECKING CONNECTION"
                : activeOnBotCheck.state === "connected"
                  ? `CONNECTED · ${activeOnBotCheck.sourceFiles ?? 0} SOURCE FILES`
                  : activeOnBotCheck.state === "failed"
                    ? "NOT AVAILABLE"
                    : "NOT CHECKED"}
            </strong>
            <small>
              {activeOnBotCheck.message
                ?? (activeOnBotCheck.state === "idle" && !window.fieldTelemetryDesktop
                  ? "Check available in the installed desktop app."
                  : activeOnBotCheck.state === "connected"
                    ? "Read-only OnBotJava capability check completed."
                    : "Check the Robot Controller's OnBotJava file endpoint.")}
            </small>
          </div>
          <button
            className="management-check-button"
            disabled={activeOnBotCheck.state === "checking" || !window.fieldTelemetryDesktop}
            onClick={() => void checkProgramAndManage()}
          >
            <RefreshCw size={14} />
            {activeOnBotCheck.state === "checking" ? "CHECKING" : "CHECK PROGRAM & MANAGE"}
          </button>
        </div>
        <button className="text-link management-profile-link" onClick={() => onNavigate("code")}>
          MANAGE ROBOT PROFILE <ChevronRight size={15} />
        </button>
      </section>

      <section className="robot-health panel" aria-labelledby="robot-health-title">
        <header className="panel-header">
          <div>
            <Label>READ-ONLY HEALTH</Label>
            <h2 id="robot-health-title">Connection diagnostics</h2>
          </div>
          <span className={`management-api-tag ${apiReachable ? "management-api-live" : ""}`}>
            {apiReachable ? "API REACHABLE" : "API UNREACHABLE"}
          </span>
        </header>
        <div className="robot-health-grid">
          <div>
            <span className="eyebrow">TELEMETRY HEARTBEAT</span>
            <strong>{robotConnected ? "ACTIVE" : apiReachable ? "INACTIVE" : "NO RESPONSE"}</strong>
          </div>
          <div>
            <span className="eyebrow">LIVE SIGNALS</span>
            <strong>{signalCount}</strong>
          </div>
          <div>
            <span className="eyebrow">RECENT ERROR LOGS</span>
            <strong className={recentErrors > 0 ? "robot-health-warning" : ""}>{recentErrors}</strong>
          </div>
          <div>
            <span className="eyebrow">LAST DATA UPDATE</span>
            <strong>{shortTime(lastUpdate)}</strong>
          </div>
        </div>
        <div className="robot-health-footer">
          <span>
            Read-only summary from the telemetry API and its bounded log response.
            No robot configuration or runtime state is changed.
          </span>
          <button className="text-link" onClick={() => onNavigate("logs")}>
            OPEN SYSTEM LOGS <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [savedProfileState, setSavedProfileState] = useState(() => readRobotProfileState(
    window.localStorage,
    backendBaseUrl(),
    window.localStorage.getItem("field-telemetry-onbot-url") ?? DEFAULT_ONBOT_URL,
  ));
  const activeProfile = savedProfileState.profiles.find(
    (profile) => profile.id === savedProfileState.activeId,
  ) ?? savedProfileState.profiles[0];
  const [baseUrl, setBaseUrl] = useState(activeProfile.telemetryUrl);
  const [simulationApiActive, setSimulationApiActive] = useState(false);
  const activeApiUrl = simulationApiActive ? "http://localhost:6302" : baseUrl;
  const client = useTelemetry(activeApiUrl);
  const [section, setSection] = useState<Section>("management");
  const [codePageMounted, setCodePageMounted] = useState(false);
  const [dashboardNames, setDashboardNames] = useState<string[]>([]);
  const [dashboardDefinitions, setDashboardDefinitions] = useState<DashboardDefinition[]>([]);
  const [selectedDashboardName, setSelectedDashboardName] = useState(
    () => window.localStorage.getItem("field-telemetry-dashboard") ?? "",
  );
  const [dashboard, setDashboard] = useState<DashboardDefinition | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeId, setThemeId] = useState(() => {
    try {
      return readThemeId(window.localStorage);
    } catch {
      return DEFAULT_THEME_ID;
    }
  });
  const [search, setSearch] = useState("");
  const [logFilter, setLogFilter] = useState("ALL");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [measurementStartedAt, setMeasurementStartedAt] = useState<number | null>(null);
  const [measurementFrames, setMeasurementFrames] = useState<Array<{
    timestamp: number;
    telemetry: TelemetryTree;
  }>>([]);
  const [measurementFile, setMeasurementFile] = useState("");
  const [importedMeasurement, setImportedMeasurement] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [measurementBusy, setMeasurementBusy] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now);
  const lastRecordedAt = useRef<number | null>(null);
  const values = useMemo(() => flattenTree(client.snapshot), [client.snapshot]);
  const featuredTelemetry = values.slice(0, 4);

  useEffect(() => {
    const simulator = window.fieldTelemetrySimulator;
    if (!simulator) return;
    let disposed = false;
    const unsubscribe = simulator.onApiState(({ running }) => {
      setSimulationApiActive(running);
    });
    void simulator.getApiState().then(({ running }) => {
      if (!disposed) setSimulationApiActive(running);
    }).catch((stateError: unknown) => {
      if (!disposed) {
        setNotice(stateError instanceof Error
          ? `Unable to check simulator API status: ${stateError.message}`
          : "Unable to check simulator API status.");
      }
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (savedProfileState.error) setNotice(savedProfileState.error);
  }, [savedProfileState.error]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    try {
      window.localStorage.setItem("field-telemetry-theme", themeId);
    } catch {
      setNotice("Theme applied for this session, but this browser could not save the preference.");
    }
  }, [themeId]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const logs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return client.logs.filter((record) => {
      const matchesLevel = logFilter === "ALL" || record.level === logFilter;
      const matchesText = !normalizedSearch ||
        `${record.component ?? ""} ${record.message} ${record.level}`.toLowerCase().includes(normalizedSearch);
      return matchesLevel && matchesText;
    });
  }, [client.logs, logFilter, search]);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const definitions = window.fieldTelemetryDesktop
          ? await window.fieldTelemetryDesktop.loadDashboards()
          : bundledDashboardDefinitions;
        if (definitions.some((definition) =>
          !definition.name || !Array.isArray(definition.widgets) ||
          definition.widgets.some((widget) => !widget.type || !widget.source))) {
          throw new Error("A dashboard definition has an invalid format.");
        }
        if (disposed) return;
        const names = definitions.map((definition) => definition.name);
        const saved = window.localStorage.getItem("field-telemetry-dashboard");
        const preferred = saved && names.includes(saved)
          ? saved
          : names.includes("Drive Dashboard")
          ? "Drive Dashboard"
          : names[0] ?? "";
        setDashboardDefinitions(definitions);
        setDashboardNames(names);
        setSelectedDashboardName((current) =>
          current && names.includes(current) ? current : preferred,
        );
        setDashboardError(null);
      } catch (loadError) {
        if (disposed) return;
        setDashboardDefinitions([]);
        setDashboardNames([]);
        setDashboard(null);
        setDashboardError(loadError instanceof Error ? loadError.message : "Dashboard definitions are unavailable.");
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDashboardName) {
      setDashboard(null);
      return;
    }
    const definition = dashboardDefinitions.find(
      (item) => item.name === selectedDashboardName,
    );
    setDashboard(definition ?? null);
    setDashboardError(definition ? null : "The selected dashboard definition is unavailable.");
  }, [dashboardDefinitions, selectedDashboardName]);

  useEffect(() => {
    const timestamp = client.lastUpdate;
    if (!activeSession || !client.robotConnected || timestamp === null ||
        lastRecordedAt.current === timestamp) return;
    lastRecordedAt.current = timestamp;
    setMeasurementFrames((frames) => frames.length >= MAX_CAPTURED_FRAMES
      ? frames
      : [...frames, { timestamp, telemetry: client.snapshot }]);
  }, [activeSession, client.lastUpdate, client.robotConnected, client.snapshot]);

  useEffect(() => {
    if (activeSession && measurementFrames.length === MAX_CAPTURED_FRAMES) {
      setNotice("Capture reached 3,000 frames. Further samples are paused; stop and save the session.");
    }
  }, [activeSession, measurementFrames.length]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const startMeasurement = async () => {
    if (!client.robotConnected) {
      setNotice("Connect to an active robot API before recording a measurement.");
      return;
    }
    const id = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const startedAt = Date.now();
    lastRecordedAt.current = null;
    setMeasurementFrames([]);
    setImportedMeasurement(null);
    setMeasurementStartedAt(startedAt);
    setActiveSession(id);
    setNotice(`Measurement session ${id} started`);
  };

  const exportMeasurement = async (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      setNotice("There is no valid measurement to export.");
      return;
    }
    setMeasurementBusy(true);
    const filename = measurementFile.trim() ||
      `${String((value as Record<string, unknown>).id ?? "measurement")}.json`;
    try {
      const contents = JSON.stringify(value, null, 2);
      if (contents === undefined) {
        throw new Error("Measurement could not be serialized as JSON.");
      }
      if (window.fieldTelemetryDesktop) {
        const saved = await window.fieldTelemetryDesktop.saveMeasurement(filename, contents);
        setNotice(saved.saved ? `Measurement saved as ${saved.filename}` : "Export canceled; the session remains available.");
      } else {
        const blob = new Blob([contents], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename.toLowerCase().endsWith(".json") ? filename : `${filename}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        setNotice(`Measurement exported as ${anchor.download}`);
      }
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : "Unable to save measurement");
    } finally {
      setMeasurementBusy(false);
    }
  };

  const stopMeasurement = async () => {
    if (!activeSession || !measurementStartedAt) return;
    const stoppedAt = Date.now();
    const result = {
      schema_version: 1,
      id: activeSession,
      started_at: measurementStartedAt,
      stopped_at: stoppedAt,
      frame_count: measurementFrames.length,
      samples: measurementFrames,
    };
    setImportedMeasurement(result);
    setActiveSession(null);
    setMeasurementStartedAt(null);
    await exportMeasurement(result);
  };

  const importMeasurement = async (file?: File) => {
    setMeasurementBusy(true);
    try {
      if (window.fieldTelemetryDesktop) {
        const loaded = await window.fieldTelemetryDesktop.loadMeasurement();
        if (!loaded) return;
        setMeasurementFile(loaded.filename);
        setImportedMeasurement(loaded.value);
        setNotice(`Loaded ${loaded.filename}`);
      } else if (file) {
        const value: unknown = JSON.parse(await file.text());
        if (!value || typeof value !== "object" || Array.isArray(value) ||
            (!Array.isArray((value as Record<string, unknown>).samples) &&
             !Array.isArray((value as Record<string, unknown>).measurements))) {
          throw new Error("The selected JSON file is not a supported measurement.");
        }
        setMeasurementFile(file.name);
        setImportedMeasurement(value);
        setNotice(`Loaded ${file.name}`);
      }
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : "Unable to load measurement");
    } finally {
      setMeasurementBusy(false);
    }
  };

  const commitRobotProfiles = (profiles: RobotProfile[], activeId: string) => {
    try {
      persistRobotProfileState(window.localStorage, profiles, activeId);
      const active = profiles.find((profile) => profile.id === activeId);
      if (!active) throw new Error("Select an existing robot profile.");
      window.localStorage.setItem("field-telemetry-robot-url", active.telemetryUrl);
      window.localStorage.setItem("field-telemetry-onbot-url", active.onBotUrl);
      setSavedProfileState({ profiles, activeId, error: null });
      setBaseUrl(active.telemetryUrl);
      return active;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save robot profiles.");
      return null;
    }
  };

  const selectRobotProfile = (profileId: string) => {
    const selected = savedProfileState.profiles.find((profile) => profile.id === profileId);
    if (!selected) {
      setNotice("That robot profile no longer exists.");
      return;
    }
    const saved = commitRobotProfiles(savedProfileState.profiles, profileId);
    if (saved) setNotice(`Connected profile set to ${saved.name}.`);
  };

  const saveRobotProfile = (
    draft: Omit<RobotProfile, "id"> & { id?: string },
    makeNew: boolean,
  ) => {
    try {
      const name = draft.name.trim();
      if (!name || name.length > 60) throw new Error("Profile name must be between 1 and 60 characters.");
      const telemetryUrl = normalizeRobotOrigin(draft.telemetryUrl, "Telemetry API address");
      const onBotUrl = normalizeRobotOrigin(draft.onBotUrl, "Program & Manage address");
      const id = makeNew
        ? `robot-${crypto.randomUUID()}`
        : draft.id ?? activeProfile.id;
      const profile: RobotProfile = { id, name, controllerType: draft.controllerType, telemetryUrl, onBotUrl };
      const profiles = makeNew
        ? [...savedProfileState.profiles, profile]
        : savedProfileState.profiles.map((entry) => entry.id === id ? profile : entry);
      if (profiles.length > 20) throw new Error("A maximum of 20 robot profiles is supported.");
      if (!makeNew && !savedProfileState.profiles.some((entry) => entry.id === id)) {
        throw new Error("The selected robot profile no longer exists.");
      }
      if (profiles.some((entry) =>
        entry.id !== profile.id && entry.name.toLocaleLowerCase() === profile.name.toLocaleLowerCase())) {
        throw new Error("Robot profile names must be unique.");
      }
      const saved = commitRobotProfiles(profiles, id);
      if (saved) setNotice(makeNew ? `Robot profile ${saved.name} added.` : `Robot profile ${saved.name} saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invalid robot profile.");
    }
  };

  const deleteRobotProfile = (profileId: string) => {
    if (savedProfileState.profiles.length <= 1) {
      setNotice("Keep at least one robot profile.");
      return;
    }
    const profiles = savedProfileState.profiles.filter((profile) => profile.id !== profileId);
    const nextActiveId = profileId === savedProfileState.activeId
      ? profiles[0].id
      : savedProfileState.activeId;
    const saved = commitRobotProfiles(profiles, nextActiveId);
    if (saved) setNotice(`Robot profile removed. Active profile: ${saved.name}.`);
  };

  const saveBackend = (url: string) => {
    try {
      const normalized = normalizeRobotOrigin(url || DEFAULT_TELEMETRY_URL, "Telemetry API address");
      const profiles = savedProfileState.profiles.map((profile) =>
        profile.id === activeProfile.id ? { ...profile, telemetryUrl: normalized } : profile,
      );
      if (!commitRobotProfiles(profiles, activeProfile.id)) return;
      setSettingsOpen(false);
      setNotice(`${activeProfile.name} telemetry API address updated.`);
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : "Invalid robot API address");
    }
  };

  const selectDashboard = (name: string) => {
    setSelectedDashboardName(name);
    window.localStorage.setItem("field-telemetry-dashboard", name);
  };

  const copyTelemetryPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setNotice(`Copied ${path}`);
    } catch {
      setNotice("Could not copy the signal path. Check clipboard permissions.");
    }
  };

  const title = navigation.find((item) => item.id === section)?.label ?? "Robot management";
  const heading = section === "management"
    ? "Robot management"
    : section === "dashboard"
    ? dashboard?.name ?? "Drive Dashboard"
    : section === "telemetry"
      ? "Telemetry"
      : section === "measurements"
        ? "Measurements"
        : section === "simulator"
          ? "Java simulator"
          : section === "code"
            ? "Robot code"
            : section === "settings"
              ? "Application settings"
            : "System logs";

  return (
    <div className="app-shell" data-theme={themeId}>
      <aside className="sidebar">
        <a className="brand-lockup" href="#" onClick={(event) => {
          event.preventDefault();
          setSection("management");
        }}>
          <span className="brand-mark"><Radio size={24} strokeWidth={3} /></span>
          <span className="brand-type">FIELD<span> TELEMETRY</span><small>ROBOT SYSTEMS</small></span>
        </a>
        <div className="nav-caption"><Label>NAVIGATION</Label><span>01—08</span></div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }, index) => (
            <button
              className={`nav-item ${section === id ? "nav-item-active" : ""}`}
              key={id}
              onClick={() => {
                if (id === "code") setCodePageMounted(true);
                setSection(id);
              }}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={2.8} />
              <span>{label}</span>
              <span className="nav-index">0{index + 1}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-rule" />
        <div className="sidebar-section-title">
          <Label>QUICK ACTIONS</Label>
          <Star size={14} fill="currentColor" />
        </div>
        <button className="quick-action" onClick={() => setSettingsOpen(true)}>
          <PlugZap size={17} strokeWidth={3} /> {section === "code" ? "TELEMETRY API" : "CONNECTION"}
        </button>
        <div className="sidebar-spacer" />
        <div className="robot-card">
          <span className="robot-sticker"><Cpu size={18} strokeWidth={3} /></span>
          <Label>TELEMETRY SOURCE</Label>
          <strong>{String(getValue(client.snapshot, "robot.name") ?? "FTC ROBOT")}</strong>
          <div className="robot-card-bottom">
            <span className="robot-mini-dot" />
            {simulationApiActive
              ? client.robotConnected ? "SIMULATION RUNNING" : "SIMULATOR ACTIVE"
              : client.robotConnected ? "ROBOT CONNECTED" : "ROBOT DISCONNECTED"}
          </div>
          <span className="robot-watermark">FTC/API</span>
        </div>
        <div className="sidebar-footer">
          <span>VERSION 2.1.0</span>
          <span>ROBOT MANAGEMENT</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>ROBOT WORKBENCH</span><ChevronRight size={14} /><strong>{title.toUpperCase()}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <div className="telemetry-clock"><Clock3 size={15} /><span>{shortTime(clockNow)}</span></div>
            {section !== "code" && (
              <StatusPill state={client.connection} simulationActive={simulationApiActive} />
            )}
            {section !== "code" && (
              <button className="icon-button settings-trigger" aria-label="Connection settings" onClick={() => setSettingsOpen(true)}>
                <Settings2 size={19} strokeWidth={2.8} />
              </button>
            )}
          </div>
        </header>

        <main className="workspace">
          <div className="page-heading">
            <div>
              <div className="heading-kicker"><span className="kicker-star"><Star size={13} fill="currentColor" /></span> {new Date(clockNow).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} / {section === "settings" ? "APPLICATION" : section === "code" || section === "management" ? "ROBOT MANAGEMENT" : "ROBOT TELEMETRY"}</div>
              <h1>{heading}<span className="heading-period">.</span></h1>
              <p className="page-subtitle">
                {section === "management" && "Your workspace for robot projects, connectivity, and field-ready system tools."}
                {section === "dashboard" && "Monitor current robot data and review recent activity."}
                {section === "telemetry" && "Browse live values reported by the robot."}
                {section === "measurements" && "Record, review, and export telemetry test runs."}
                {section === "simulator" && "Build and test FTC-style OpModes with simulated hardware."}
                {section === "code" && "Edit Java source, upload it over Wi-Fi, and build it on the Robot Controller."}
                {section === "logs" && "Review diagnostic and lifecycle messages from the robot."}
                {section === "settings" && "Choose your application theme and manage the active robot connection."}
              </p>
            </div>
            <div className="heading-aside">
              <div className="sticker">
                <span>{section === "code" ? "JAVA" : section === "management" ? "FTC" : section === "settings" ? "APP" : "LIVE"}</span>
                <small>{section === "code" ? "FTC" : section === "settings" ? "UI" : <>10<br />HZ</>}</small>
              </div>
              <span className="heading-aside-caption">
                {section === "code" ? <>ROBOT<br />CODE</> : section === "management" ? <>ROBOT<br />OPS</> : section === "settings" ? <>APP<br />SETTINGS</> : <>ROBOT<br />TELEMETRY</>}
              </span>
            </div>
          </div>

          {section !== "code" && section !== "management" && section !== "settings" && client.error && (
            <div className="error-banner" role="alert">
              <CircleHelp size={18} strokeWidth={3} />
              <span>Robot API response issue: {client.error}</span>
              <button onClick={client.checkConnection} aria-label="Retry robot connection"><RefreshCw size={16} /></button>
            </div>
          )}

          {section !== "code" && section !== "management" && section !== "settings" && client.connection !== "connected" && (
            <section className="robot-connection-banner" role="status" aria-live="polite">
              <div className="connection-banner-copy">
                <strong>
                  {simulationApiActive
                    ? client.connection === "checking" ? "Connecting to simulator" : "Simulator telemetry unavailable"
                    : client.connection === "checking" ? "Checking robot connection" : "Robot disconnected"}
                </strong>
                <span>
                  {client.connection === "checking"
                    ? simulationApiActive
                      ? "Connecting to the simulator API on this computer."
                      : "Trying to reach the robot telemetry API."
                    : client.apiReachable
                      ? simulationApiActive
                        ? "The simulator API is responding, but the OpMode has not sent a telemetry update yet."
                        : "The API is responding, but the robot has not sent a recent telemetry heartbeat. Start an OpMode that publishes telemetry."
                      : `Cannot reach ${activeApiUrl}. ${simulationApiActive
                        ? "Check that the simulator is still running."
                        : "Make sure your computer is on the robot Wi-Fi and the robot API is running."}`}
                </span>
              </div>
              <span className={`api-reachability ${client.apiReachable ? "api-reachable" : ""}`}>
                {simulationApiActive
                  ? client.apiReachable ? "SIMULATION API READY" : "SIMULATION API UNREACHABLE"
                  : client.apiReachable ? "API RESPONDING" : "API UNREACHABLE"}
              </span>
              <HardButton
                variant="white"
                className="connection-check-button"
                onClick={client.checkConnection}
              >
                <RefreshCw size={15} /> {simulationApiActive ? "CHECK SIMULATION" : "CHECK CONNECTION"}
              </HardButton>
            </section>
          )}

          {section !== "code" && section !== "management" && section !== "settings" && <section className="metrics-strip" aria-label="Robot status">
            {featuredTelemetry.length ? featuredTelemetry.map(([path, value], index) => {
              const Icon = [Battery, RotateCcw, Zap, ShieldCheck][index];
              return (
                <MetricCard
                  key={path}
                  label={path.replaceAll(".", " / ").replaceAll("_", " ").toUpperCase()}
                  value={value}
                  icon={Icon}
                  color={index % 3 === 0 ? "yellow" : index % 3 === 1 ? "violet" : "red"}
                  note="LIVE ROBOT DATA"
                />
              );
            }) : (
              <div className="empty-panel dashboard-api-empty">
                Telemetry appears here when the robot sends its first update.
              </div>
            )}
          </section>}

          {section === "management" && (
            <RobotManagementPage
              profile={activeProfile}
              connection={client.connection}
              apiReachable={client.apiReachable}
              robotConnected={client.robotConnected}
              lastUpdate={client.lastUpdate}
              signalCount={values.length}
              logs={client.logs}
              simulationActive={simulationApiActive}
              onNavigate={(target) => {
                if (target === "code") setCodePageMounted(true);
                setSection(target);
              }}
            />
          )}

          {section === "dashboard" && (
            <DashboardPage
              dashboard={dashboard}
              dashboardNames={dashboardNames}
              selectedName={selectedDashboardName}
              onSelect={selectDashboard}
              dashboardError={dashboardError}
              snapshot={client.snapshot}
              histories={client.histories}
              lastUpdate={client.lastUpdate}
              robotConnected={client.robotConnected}
              logs={client.logs.slice(-5).reverse()}
              setSection={setSection}
            />
          )}

          {section === "telemetry" && (
            <TelemetryPage
              values={values}
              snapshot={client.snapshot}
              search={search}
              onSearch={setSearch}
              histories={client.histories}
              copyPath={(path) => void copyTelemetryPath(path)}
            />
          )}

          {section === "measurements" && (
            <MeasurementsPage
              activeSession={activeSession}
              frameCount={measurementFrames.length}
              limitReached={measurementFrames.length === MAX_CAPTURED_FRAMES}
              robotConnected={client.robotConnected}
              filename={measurementFile}
              setFilename={setMeasurementFile}
              start={startMeasurement}
              stop={stopMeasurement}
              importMeasurement={importMeasurement}
              exportMeasurement={() => void exportMeasurement(importedMeasurement)}
              result={importedMeasurement}
              busy={measurementBusy}
            />
          )}

          {section === "simulator" && <SimulatorPage />}

          {codePageMounted && (
            <div className="robot-code-page-shell" hidden={section !== "code"} aria-hidden={section !== "code"}>
              <Suspense fallback={<div className="empty-panel">Loading the Java editor...</div>}>
                <RobotCodePage
                  profiles={savedProfileState.profiles}
                  activeProfile={activeProfile}
                  onSelectProfile={selectRobotProfile}
                  onSaveProfile={saveRobotProfile}
                  onDeleteProfile={deleteRobotProfile}
                />
              </Suspense>
            </div>
          )}

          {section === "logs" && (
            <LogsPage
              logs={logs}
              filter={logFilter}
              setFilter={setLogFilter}
              search={search}
              setSearch={setSearch}
              refresh={() => void client.refreshLogs()}
            />
          )}

          {section === "settings" && (
            <SettingsPage
              themeId={themeId}
              onThemeChange={setThemeId}
              robotAddress={activeProfile.telemetryUrl}
              onEditConnection={() => setSettingsOpen(true)}
            />
          )}

          <footer className="workspace-footer">
            <span>LAST FRAME <strong>{shortTime(client.lastUpdate)}</strong></span>
            <span>
              {section === "code"
                ? "SOURCE DEPLOYMENT · NO OPMODE START"
                : section === "settings" ? "APPLICATION PREFERENCES"
                  : section === "management" ? "ROBOT MANAGEMENT WORKSPACE" : "ROBOT TELEMETRY"}
              <ShieldCheck size={13} />
            </span>
            <span>
              {section === "code"
                ? "ONBOTJAVA · WIFI"
                : <>{simulationApiActive ? "SIMULATION API" : "ROBOT API"} <strong>{new URL(activeApiUrl).host}</strong></>}
            </span>
          </footer>
        </main>
      </div>

      {notice && (
        <div className="toast" role="status">
          <span className="toast-mark"><Zap size={17} fill="currentColor" /></span>
          <span>{notice}</span>
          <button className="toast-close" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      )}
      {settingsOpen && (
        <SettingsDialog initialUrl={baseUrl} onClose={() => setSettingsOpen(false)} onSave={saveBackend} />
      )}
    </div>
  );
}

function DashboardPage({
  dashboard,
  dashboardNames,
  selectedName,
  onSelect,
  dashboardError,
  snapshot,
  histories,
  lastUpdate,
  robotConnected,
  logs,
  setSection,
}: {
  dashboard: DashboardDefinition | null;
  dashboardNames: string[];
  selectedName: string;
  onSelect: (name: string) => void;
  dashboardError: string | null;
  snapshot: TelemetryTree;
  histories: Record<string, TelemetryPoint[]>;
  lastUpdate: number | null;
  robotConnected: boolean;
  logs: LogRecord[];
  setSection: (section: Section) => void;
}) {
  const apiValues = flattenTree(snapshot);
  const configuredSources = new Set(dashboard?.widgets.map((widget) => widget.source) ?? []);
  const liveSignals = apiValues
    .filter(([path]) => !configuredSources.has(path))
    .slice(0, 8);
  const featuredSignals = apiValues.slice(0, 4);
  const metricIcons = [Battery, RotateCcw, Zap, ShieldCheck];
  return (
    <div className="dashboard-content">
      <div className="dashboard-toolbar">
        <div className="definition-select-wrap">
          <Label>DASHBOARD LAYOUT</Label>
          <div className="select-shell">
            <LayoutDashboard size={17} strokeWidth={3} />
            <select
              aria-label="Select external dashboard"
              value={selectedName}
              onChange={(event) => onSelect(event.target.value)}
              disabled={dashboardNames.length === 0}
            >
              {dashboardNames.length === 0 && <option value="">No dashboards available</option>}
              {dashboardNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={17} strokeWidth={3} />
          </div>
        </div>
        <div className="toolbar-meta">
          <span className="toolbar-live"><span /> {robotConnected ? "LIVE TELEMETRY" : "WAITING FOR ROBOT"}</span>
          <span className="toolbar-frame">LAST UPDATE {lastUpdate ? shortTime(lastUpdate) : "—"}</span>
        </div>
      </div>

      {dashboardError && (
        <div className="empty-panel dashboard-warning" role="status">
          <CircleHelp size={21} />
          <div><strong>Dashboard layouts are unavailable.</strong><span>{dashboardError}</span></div>
        </div>
      )}

      <div className="dashboard-widget-grid">
        {dashboard?.widgets.map((widget, index) => (
          <DashboardWidgetCard
            key={`${dashboard.name}-${widget.source}-${index}`}
            widget={widget}
            snapshot={snapshot}
            history={histories[widget.source] ?? []}
            index={index}
          />
        ))}
        {dashboard && dashboard.widgets.length === 0 && (
          <div className="empty-panel">This dashboard has no widgets yet.</div>
        )}
        {!dashboard && !dashboardError && (
          <div className="empty-panel"><RefreshCw size={20} className="spin-once" /> Loading dashboard layout…</div>
        )}
      </div>

      <div className="section-marker dashboard-live-heading">
        <Label>LIVE ROBOT TELEMETRY</Label>
        <span>{apiValues.length} SIGNALS</span>
      </div>
      <div className="metrics-strip dashboard-api-signals" aria-label="Live API telemetry signals">
        {featuredSignals.length ? featuredSignals.map(([path, value], index) => (
          <MetricCard
            key={path}
            label={path.replaceAll(".", " / ").replaceAll("_", " ").toUpperCase()}
            value={value}
            icon={metricIcons[index]}
            color={index % 3 === 0 ? "yellow" : index % 3 === 1 ? "violet" : "red"}
            note="LIVE ROBOT DATA"
          />
        )) : (
          <div className="empty-panel dashboard-api-empty">
            Waiting for the robot to send its first telemetry update.
          </div>
        )}
      </div>
      {liveSignals.length > 0 && (
        <div className="dashboard-widget-grid dashboard-live-widgets">
          {liveSignals.map(([source, value], index) => (
            <DashboardWidgetCard
              key={`api-${source}`}
              widget={{ type: typeof value === "number" ? "graph" : "value", source }}
              snapshot={snapshot}
              history={histories[source] ?? []}
              index={index}
            />
          ))}
        </div>
      )}

      <div className="lower-grid">
        <Panel title="Robot at a glance"         eyebrow="OVERVIEW" accent="cream" className="glance-panel">
          <div className="glance-list">
            <div><span>MODE</span><strong>{displayValue(getValue(snapshot, "robot.mode"))}</strong></div>
            <div><span>LEFT ENCODER</span><strong>{displayValue(getValue(snapshot, "drive.fl.encoder"))}</strong></div>
            <div><span>RIGHT ENCODER</span><strong>{displayValue(getValue(snapshot, "drive.fr.encoder"))}</strong></div>
            <div><span>UPDATED</span><strong>{shortTime(lastUpdate)}</strong></div>
          </div>
        </Panel>
        <Panel
          title="Robot link"
          eyebrow="ROBOT CONNECTION"
          accent="yellow"
          className="pit-panel"
          action={<span className="pit-number">01</span>}
        >
          <p>{robotConnected
            ? "The robot control loop is live. Telemetry is read directly from its API."
            : "No recent telemetry received. Check that an OpMode is running and both devices are on the same Wi-Fi network."}</p>
          <HardButton onClick={() => setSection("telemetry")} variant="red">
            <Activity size={16} strokeWidth={3} /> VIEW TELEMETRY
          </HardButton>
        </Panel>
        <Panel
          title="Recent robot logs"
          eyebrow="DIAGNOSTICS"
          accent="violet"
          className="latest-logs"
          action={<button className="text-link" onClick={() => setSection("logs")}>VIEW ALL LOGS <ChevronRight size={14} /></button>}
        >
          <div className="mini-logs">
            {logs.length ? logs.map((record) => (
              <div key={record.sequence} className="mini-log-row">
                <time>{shortTime(record.timestamp)}</time>
                <span className={`log-level level-${record.level.toLowerCase()}`}>{record.level}</span>
                <p>{record.component ? `${record.component}: ${record.message}` : record.message}</p>
              </div>
            )) : <span className="empty-inline">No robot log entries yet.</span>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TelemetryPage({
  values,
  snapshot,
  search,
  onSearch,
  histories,
  copyPath,
}: {
  values: Array<[string, unknown]>;
  snapshot: TelemetryTree;
  search: string;
  onSearch: (value: string) => void;
  histories: Record<string, TelemetryPoint[]>;
  copyPath: (path: string) => void;
}) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const visibleValues = values.filter(([path]) => path.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="telemetry-page">
      <Panel title="Telemetry signals" eyebrow="LIVE ROBOT DATA" accent="cream" className="tree-panel">
        <div className="tree-toolbar">
          <div className="search-field">
            <Search size={18} strokeWidth={3} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search signal paths..."
              aria-label="Filter telemetry paths"
            />
            <span>{visibleValues.length} / {values.length}</span>
          </div>
          <span className="tree-refresh"><span /> UPDATING LIVE</span>
        </div>
        {values.length === 0 ? (
          <div className="empty-panel">Telemetry will appear here when the robot sends its first update.</div>
        ) : visibleValues.length === 0 ? (
          <div className="empty-panel">No signals match “{search}”.</div>
        ) : (
          <div className="telemetry-table">
            <div className="telemetry-table-header"><span>PATH</span><span>TYPE</span><span>VALUE</span><span /></div>
            <TelemetryBranch
              tree={snapshot}
              prefix=""
              filter={search}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              copyPath={copyPath}
            />
          </div>
        )}
      </Panel>
      <div className="telemetry-side">
        <Panel title="Signal details" eyebrow="SELECT A SIGNAL" accent="violet">
          {selectedPath ? (
            <div className="signal-detail">
              <code>{selectedPath}</code>
              <strong>{displayValue(getValue(snapshot, selectedPath))}</strong>
              <Sparkline points={histories[selectedPath] ?? []} label={selectedPath} />
            </div>
          ) : (
            <div className="detail-empty"><span className="detail-cross">+</span><p>Select a signal to see its full value and recent history.</p></div>
          )}
        </Panel>
        <Panel title="Signal groups" eyebrow="TOP-LEVEL PATHS" accent="yellow">
          <div className="group-tags">
            {Object.keys(snapshot).map((group, index) => (
              <span className={`group-tag group-tag-${index % 3}`} key={group}>
                <span /> {group.toUpperCase()}
              </span>
            ))}
          </div>
          <p className="group-footnote">Signal paths are added by the robot at runtime. Select a row to inspect it or copy its path.</p>
        </Panel>
      </div>
      <div className="telemetry-selection-overlay" aria-hidden="true" />
    </div>
  );
}

function MeasurementsPage({
  activeSession,
  frameCount,
  limitReached,
  robotConnected,
  filename,
  setFilename,
  start,
  stop,
  importMeasurement,
  exportMeasurement,
  result,
  busy,
}: {
  activeSession: string | null;
  frameCount: number;
  limitReached: boolean;
  robotConnected: boolean;
  filename: string;
  setFilename: (value: string) => void;
  start: () => void;
  stop: () => void;
  importMeasurement: (file?: File) => Promise<void>;
  exportMeasurement: () => void;
  result: unknown;
  busy: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureContents = [
    { name: "Timestamped frames", detail: "Each successful robot API sample.", color: "red", icon: Clock3 },
    { name: "Dynamic telemetry", detail: "Every registered path in the robot snapshot.", color: "violet", icon: Activity },
    { name: "Portable archive", detail: "Versioned JSON that can be imported or shared.", color: "yellow", icon: Save },
  ];
  const sessionObject = result && typeof result === "object"
    ? result as Record<string, unknown>
    : null;
  const results = sessionObject && Array.isArray(sessionObject.measurements)
    ? sessionObject.measurements
    : [];
  const samples = sessionObject && Array.isArray(sessionObject.samples)
    ? sessionObject.samples
    : [];

  return (
    <div className="measurements-page">
      <div className="measurement-intro">
        <div className="measurement-intro-copy">
          <Label>TEST SESSION / {activeSession ? (limitReached ? "LIMIT REACHED" : "RECORDING") : "READY"}</Label>
          <h2>{activeSession ? "Recording telemetry" : "Start a measurement session"}</h2>
          <p>Capture telemetry from the robot, then export the session as a JSON file.</p>
          {activeSession && <div className="session-live"><span /> {activeSession} / {frameCount} FRAMES CAPTURED</div>}
        </div>
        <div className="measurement-controls">
          {!activeSession ? (
            <HardButton variant="red" onClick={start} disabled={busy || !robotConnected}><Activity size={17} strokeWidth={3} /> START RECORDING</HardButton>
          ) : (
            <HardButton variant="black" onClick={stop} disabled={busy}><TerminalSquare size={17} strokeWidth={3} /> STOP &amp; SAVE</HardButton>
          )}
          <span>JSON EXPORT / UP TO 3,000 FRAMES</span>
        </div>
      </div>
      <div className="measurement-catalog">
        <div className="section-marker"><Label>SESSION CONTENTS</Label><span>ROBOT API DATA</span></div>
        <div className="measurement-grid">
          {captureContents.map(({ name, detail, color, icon: Icon }, index) => (
            <article className={`measurement-card measurement-${color}`} key={name}>
              <div className="measurement-card-top">
                <span className="measurement-icon"><Icon size={21} strokeWidth={3} /></span>
                <span className="measurement-number">0{index + 1}</span>
              </div>
              <h3>{name}</h3>
              <p>{detail}</p>
              <span className="measurement-ready"><span /> CAPTURED PER FRAME</span>
            </article>
          ))}
        </div>
      </div>
      <Panel title="Import or export a session" eyebrow="MEASUREMENT FILES" accent="cream" className="archive-panel">
        <div className="archive-controls">
          <label className="archive-input-wrap">
            <span>EXPORT FILE NAME</span>
            <input
              className="text-input"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              placeholder="robot_run.json"
              aria-label="Measurement export filename"
            />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importMeasurement(file);
              event.target.value = "";
            }}
          />
          <HardButton
            onClick={() => {
              if (window.fieldTelemetryDesktop) void importMeasurement();
              else fileInputRef.current?.click();
            }}
            disabled={busy}
            variant="yellow"
          >
            <RefreshCw size={16} strokeWidth={3} /> IMPORT SESSION
          </HardButton>
          <span className="archive-hint">Session files use portable JSON format.</span>
        </div>
        {sessionObject && (
          <div className="measurement-results">
            <div className="results-heading">
              <span>SESSION RESULTS</span>
              <strong>{String(sessionObject.id ?? "IMPORTED RUN")}</strong>
              <HardButton onClick={exportMeasurement} disabled={busy} variant="yellow">
                <Save size={15} strokeWidth={3} /> EXPORT JSON
              </HardButton>
            </div>
            <div className="results-grid">
              {results.map((item, index) => {
                const entry = item as Record<string, unknown>;
                return (
                  <div className="result-chip" key={`${String(entry.name)}-${index}`}>
                    <Label>{String(entry.name ?? "MEASUREMENT").replaceAll("_", " ")}</Label>
                    {Object.entries(entry)
                      .filter(([key]) => key !== "name" && key !== "encoder_path" && key !== "voltage_path")
                      .map(([key, value]) => (
                        <div className="result-item" key={key}><span>{key.replaceAll("_", " ")}</span><strong>{displayValue(value)}</strong></div>
                      ))}
                  </div>
                );
              })}
              {!results.length && (
                <div className="result-chip">
                  <Label>CAPTURED TELEMETRY</Label>
                  <div className="result-item"><span>FRAMES</span><strong>{String(sessionObject.frame_count ?? samples.length)}</strong></div>
                  <div className="result-item"><span>STARTED</span><strong>{displayValue(sessionObject.started_at)}</strong></div>
                  <div className="result-item"><span>STOPPED</span><strong>{displayValue(sessionObject.stopped_at)}</strong></div>
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function LogsPage({
  logs,
  filter,
  setFilter,
  search,
  setSearch,
  refresh,
}: {
  logs: LogRecord[];
  filter: string;
  setFilter: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  refresh: () => void;
}) {
  const filters = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR"];
  return (
    <div className="logs-page">
      <Panel
        title="Robot logs"
        eyebrow="DIAGNOSTIC EVENTS"
        accent="black"
        className="logs-panel"
        action={<HardButton variant="yellow" onClick={refresh}><RefreshCw size={15} strokeWidth={3} /> REFRESH LOGS</HardButton>}
      >
        <div className="logs-toolbar">
          <div className="search-field log-search">
            <Search size={17} strokeWidth={3} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search robot logs..." aria-label="Search logs" />
          </div>
          <div className="log-filters" role="group" aria-label="Filter logs by level">
            {filters.map((item) => (
              <button key={item} className={filter === item ? "filter-active" : ""} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="log-countline"><span><span className="log-live-dot" /> ROBOT LOGS</span><strong>{logs.length} EVENTS</strong></div>
        <div className="log-list">
          {logs.length ? logs.slice().reverse().map((record) => (
            <LogRow key={record.sequence} record={record} />
          )) : (
            <div className="empty-panel log-empty"><TerminalSquare size={21} /> No events match this filter.</div>
          )}
        </div>
      </Panel>
      <div className="logs-note"><Command size={18} strokeWidth={3} /><span>Log entries are read from the robot API.</span><strong>SEQUENCE / TIME / LEVEL / MESSAGE</strong></div>
    </div>
  );
}
