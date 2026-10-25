import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Download,
  FileCode2,
  Folder,
  FolderOpen,
  Hammer,
  RefreshCw,
  Save,
  Server,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RobotControllerType, RobotProfile } from "./types";

type JavaSource = {
  id: string;
  name: string;
  source: string;
  uploadedSource: string | null;
  savedSource: string | null;
  openedSource: string;
  relativePath?: string;
};

type ProjectTreeNode = {
  name: string;
  path: string;
  file?: JavaSource;
  children: ProjectTreeNode[];
};

type RobotConnection = {
  connected: boolean;
  sourceFiles: number;
  sourcePaths: string[] | null;
  allowExternalLibraries: boolean;
};

const DEFAULT_ONBOT_URL = "http://192.168.43.1:8080";
const MAX_SOURCE_FILES = 50;
const MAX_SOURCE_BYTES = 1024 * 1024;

interface RobotCodePageProps {
  profiles: RobotProfile[];
  activeProfile: RobotProfile;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (profile: Omit<RobotProfile, "id"> & { id?: string }, makeNew: boolean) => void;
  onDeleteProfile: (id: string) => void;
}

function packageFor(source: string): string {
  const match = source.match(/^\s*package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m);
  return match?.[1] ?? "(default package)";
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "The robot request failed.";
}

function hostFor(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl || "Robot Controller";
  }
}

function onBotDestination(file: JavaSource): string {
  const packageName = packageFor(file.source);
  return packageName === "(default package)"
    ? file.name
    : `${packageName.replaceAll(".", "/")}/${file.name}`;
}

function hasUnsavedChanges(file: JavaSource): boolean {
  return file.relativePath
    ? file.savedSource !== file.source
    : file.openedSource !== file.source;
}

function normalizedRobotPath(sourcePath: string): string {
  return sourcePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^src\//, "");
}

function findRemoteOverwrites(files: JavaSource[], sourcePaths: string[] | null | undefined): string[] | null {
  if (!sourcePaths) return null;
  const remotePaths = new Set(sourcePaths.map(normalizedRobotPath));
  return files
    .map(onBotDestination)
    .filter((destination) => remotePaths.has(normalizedRobotPath(destination)));
}

export default function RobotCodePage({
  profiles,
  activeProfile,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
}: RobotCodePageProps) {
  const [baseUrl, setBaseUrl] = useState(
    () => activeProfile.onBotUrl || DEFAULT_ONBOT_URL,
  );
  const [profileName, setProfileName] = useState(activeProfile.name);
  const [controllerType, setControllerType] = useState<RobotControllerType>(activeProfile.controllerType);
  const [profileTelemetryUrl, setProfileTelemetryUrl] = useState(activeProfile.telemetryUrl);
  const [profileOnBotUrl, setProfileOnBotUrl] = useState(activeProfile.onBotUrl);
  const [connection, setConnection] = useState<RobotConnection | null>(null);
  const [files, setFiles] = useState<JavaSource[]>([]);
  const [projectRoot, setProjectRoot] = useState("");
  const [projectName, setProjectName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState<"check" | "project" | "save" | "upload" | "build" | "emulator" | null>(null);
  const [emulatorOrigin, setEmulatorOrigin] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [uploadConfirmation, setUploadConfirmation] = useState(false);
  const [buildLog, setBuildLog] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const previousBaseUrl = useRef<string | null>(null);

  const selectedFile = files.find((file) => file.id === selectedId) ?? null;
  const pendingCount = files.filter((file) => file.uploadedSource !== file.source).length;
  const dirtyCount = files.filter(hasUnsavedChanges).length;
  const canDeploy = Boolean(window.fieldTelemetryDesktop);
  const projectTree = useMemo(() => {
    const root: ProjectTreeNode = { name: projectName || "Open files", path: "", children: [] };
    for (const file of files) {
      const relativePath = file.relativePath ?? file.name;
      const segments = relativePath.split(/[\\/]/).filter(Boolean);
      let parent = root;
      for (const segment of segments.slice(0, -1)) {
        const folderPath = parent.path ? `${parent.path}/${segment}` : segment;
        let folder = parent.children.find((child) => child.path === folderPath);
        if (!folder) {
          folder = { name: segment, path: folderPath, children: [] };
          parent.children.push(folder);
        }
        parent = folder;
      }
      parent.children.push({
        name: segments[segments.length - 1] ?? file.name,
        path: relativePath,
        file,
        children: [],
      });
    }
    const sortTree = (node: ProjectTreeNode) => {
      node.children.sort((left, right) =>
        Number(Boolean(left.file)) - Number(Boolean(right.file)) ||
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      );
      node.children.forEach(sortTree);
    };
    sortTree(root);
    return root;
  }, [files, projectName]);
  const selectedPackage = useMemo(
    () => selectedFile ? packageFor(selectedFile.source) : "",
    [selectedFile],
  );
  const remoteOverwritePaths = useMemo(
    () => findRemoteOverwrites(files, connection?.sourcePaths),
    [connection, files],
  );

  useEffect(() => {
    setBaseUrl(activeProfile.onBotUrl);
    setProfileName(activeProfile.name);
    setControllerType(activeProfile.controllerType);
    setProfileTelemetryUrl(activeProfile.telemetryUrl);
    setProfileOnBotUrl(activeProfile.onBotUrl);
    setConnection(null);
  }, [activeProfile.id, activeProfile.name, activeProfile.controllerType, activeProfile.telemetryUrl, activeProfile.onBotUrl]);

  const makeProjectFiles = (project: {
    projectPath: string;
    projectName: string;
    files: Array<{ relativePath: string; source: string }>;
  }) => ({
    files: project.files.map((file, index) => ({
      id: `${project.projectPath}:${file.relativePath}:${index}`,
      name: file.relativePath.split(/[\\/]/).pop() ?? file.relativePath,
      source: file.source,
      uploadedSource: null,
      savedSource: file.source,
      openedSource: file.source,
      relativePath: file.relativePath,
    })),
    projectPath: project.projectPath,
    projectName: project.projectName,
  });

  const replaceProject = (project: {
    projectPath: string;
    projectName: string;
    files: Array<{ relativePath: string; source: string }>;
  }) => {
    const workspace = makeProjectFiles(project);
    setFiles(workspace.files);
    setProjectRoot(workspace.projectPath);
    setProjectName(workspace.projectName);
    setSelectedId(workspace.files[0]?.id ?? "");
    setCollapsedFolders(new Set());
    setMessage(`Linked ${workspace.projectName}: ${workspace.files.length} Java source file(s). Files remain in their original project folders.`);
    setMessageIsError(false);
  };

  useEffect(() => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) return undefined;
    let active = true;
    void desktop.loadRobotProject().then((project) => {
      if (active && project) replaceProject(project);
    }).catch((error: unknown) => {
      if (active) {
        setMessage(`Could not reload the linked Java project: ${formatError(error)}`);
        setMessageIsError(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const linkProject = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) {
      setMessage("Linking and saving a project folder requires the installed desktop app.");
      setMessageIsError(true);
      return;
    }
    if (dirtyCount > 0 &&
        !window.confirm("Replace the open editor contents? Unsaved local edits will be discarded.")) {
      return;
    }
    setBusy("project");
    try {
      const project = await desktop.selectRobotProject();
      if (!project || project.canceled) return;
      replaceProject(project);
    } catch (error) {
      setMessage(`Could not link the Java project: ${formatError(error)}`);
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const saveProjectSource = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop || !selectedFile?.relativePath) return;
    setBusy("save");
    try {
      let result = await desktop.saveRobotProjectSource(
        selectedFile.relativePath,
        selectedFile.source,
        selectedFile.savedSource ?? "",
      );
      if (result.conflict && result.diskSource !== undefined) {
        const overwrite = window.confirm(
          `${selectedFile.relativePath} changed outside Robot Workbench. Overwrite the newer disk version with your editor contents?`,
        );
        if (!overwrite) {
          setMessage(`Save canceled. ${selectedFile.relativePath} has newer changes on disk; reload the project to review them.`);
          setMessageIsError(true);
          return;
        }
        result = await desktop.saveRobotProjectSource(
          selectedFile.relativePath,
          selectedFile.source,
          result.diskSource,
        );
      }
      if (result.conflict) {
        setMessage(`Could not save ${selectedFile.relativePath}: the file changed again on disk. Review the newer version and retry.`);
        setMessageIsError(true);
        return;
      }
      setFiles((current) => current.map((file) =>
        file.id === selectedFile.id
          ? { ...file, savedSource: file.source, openedSource: file.source }
          : file,
      ));
      setMessage(`Saved ${selectedFile.relativePath} in ${projectName}.`);
      setMessageIsError(false);
    } catch (error) {
      setMessage(`Could not save the project source: ${formatError(error)}`);
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const reloadProject = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) return;
    if (dirtyCount > 0 &&
        !window.confirm(`Reload ${projectName || "the project"} from disk? This will discard ${dirtyCount} unsaved editor change(s).`)) {
      return;
    }
    setBusy("project");
    try {
      const project = await desktop.loadRobotProject();
      if (!project) {
        setMessage("No linked project is available. Link a project folder first.");
        setMessageIsError(true);
        return;
      }
      replaceProject(project);
    } catch (error) {
      setMessage(`Could not reload the project from disk: ${formatError(error)}`);
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = (makeNew: boolean) => {
    onSaveProfile({
      ...(makeNew ? {} : { id: activeProfile.id }),
      name: profileName,
      controllerType,
      telemetryUrl: profileTelemetryUrl,
      onBotUrl: profileOnBotUrl,
    }, makeNew);
  };

  const checkConnection = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) {
      setConnection(null);
      setMessage("Robot code deployment is available in the installed desktop app.");
      setMessageIsError(true);
      return;
    }

    setBusy("check");
    setMessage("");
    setMessageIsError(false);
    try {
      const result = await desktop.checkOnBotJava(baseUrl);
      setConnection(result);
      const normalizedUrl = new URL(baseUrl).origin;
      setMessage(
        emulatorOrigin
          ? `Connected to the local OnBotJava mock. ${result.sourceFiles} mock source file(s) are available.`
          : `Connected to OnBotJava. ${result.sourceFiles} source file(s) found on the robot.` +
            (normalizedUrl === activeProfile.onBotUrl
              ? ""
              : " Save this robot profile to keep the updated Program & Manage address."),
      );
    } catch (error) {
      setConnection(null);
      setMessage(formatError(error));
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const toggleEmulator = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) return;
    setBusy("emulator");
    setMessage("");
    setMessageIsError(false);
    try {
      if (emulatorOrigin) {
        await desktop.stopOnBotEmulator();
        setEmulatorOrigin(null);
        setBaseUrl(previousBaseUrl.current || activeProfile.onBotUrl || DEFAULT_ONBOT_URL);
        previousBaseUrl.current = null;
        setConnection(null);
        setMessage("Local OnBotJava mock stopped. The saved robot address has been restored.");
      } else {
        const result = await desktop.startOnBotEmulator();
        if (!result.running || !result.origin) {
          throw new Error("The local OnBotJava mock did not start.");
        }
        previousBaseUrl.current = baseUrl;
        setEmulatorOrigin(result.origin);
        setBaseUrl(result.origin);
        setConnection(null);
        setMessage("Local protocol mock running. Its build result is simulated; it does not compile Java or verify an FTC SDK.");
      }
    } catch (error) {
      setMessage(formatError(error));
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const addFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const candidates = Array.from(selected);
    if (candidates.some((file) => !file.name.toLowerCase().endsWith(".java"))) {
      setMessage("Only .java source files can be added to the OnBotJava editor.");
      setMessageIsError(true);
      return;
    }
    if (candidates.some((file) => file.size > MAX_SOURCE_BYTES)) {
      setMessage("Each Java source file must be no larger than 1 MB.");
      setMessageIsError(true);
      return;
    }
    if (files.length + candidates.length > MAX_SOURCE_FILES) {
      setMessage(`A maximum of ${MAX_SOURCE_FILES} source files can be open at once.`);
      setMessageIsError(true);
      return;
    }

    try {
      const imported = await Promise.all(candidates.map(async (file, index) => {
        const source = await file.text();
        return {
          id: `${Date.now()}-${index}-${file.name}`,
          name: file.name,
          source,
          uploadedSource: null,
          savedSource: null,
          openedSource: source,
        };
      }));
      setFiles((current) => [...current, ...imported]);
      setSelectedId(imported[0].id);
      setMessage(`${imported.length} Java source file(s) opened locally.`);
      setMessageIsError(false);
    } catch (error) {
      setMessage(`Could not read the selected source file: ${formatError(error)}`);
      setMessageIsError(true);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const updateSource = (source: string) => {
    if (!selectedFile) return;
    setFiles((current) => current.map((file) =>
      file.id === selectedFile.id ? { ...file, source } : file,
    ));
  };

  const saveSource = () => {
    if (!selectedFile) return;
    const download = document.createElement("a");
    download.href = URL.createObjectURL(
      new Blob([selectedFile.source], { type: "text/x-java; charset=utf-8" }),
    );
    download.download = selectedFile.name;
    download.click();
    setTimeout(() => URL.revokeObjectURL(download.href), 0);
    setFiles((current) => current.map((file) =>
      file.id === selectedFile.id ? { ...file, openedSource: file.source } : file,
    ));
    setMessage(`Saved a local copy of ${selectedFile.name}.`);
    setMessageIsError(false);
  };

  const uploadSources = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop || files.length === 0) return;
    const destinations = new Map<string, string>();
    for (const file of files) {
      const destination = onBotDestination(file);
      const existing = destinations.get(destination);
      if (existing) {
        setMessage(`${existing} and ${file.relativePath ?? file.name} both upload to ${destination}. Rename one file before uploading.`);
        setMessageIsError(true);
        return;
      }
      destinations.set(destination, file.relativePath ?? file.name);
    }
    setBusy("upload");
    setMessage("");
    setMessageIsError(false);
    let uploaded = 0;
    try {
      const latestConnection = await desktop.checkOnBotJava(baseUrl);
      const latestOverwritePaths = findRemoteOverwrites(files, latestConnection.sourcePaths);
      if (JSON.stringify(latestOverwritePaths) !== JSON.stringify(remoteOverwritePaths)) {
        setConnection(latestConnection);
        setUploadConfirmation(true);
        setMessage("The Robot Controller source tree changed since confirmation opened. Review the updated overwrite list before uploading.");
        setMessageIsError(true);
        return;
      }
      setConnection(latestConnection);
      setUploadConfirmation(false);
      for (const [index, file] of files.entries()) {
        setMessage(`Uploading ${index + 1} of ${files.length}: ${file.relativePath ?? file.name}`);
        await desktop.uploadOnBotJava(baseUrl, file.name, file.source);
        setFiles((current) => current.map((entry) =>
          entry.id === file.id ? { ...entry, uploadedSource: file.source } : entry,
        ));
        uploaded += 1;
      }
      const refreshed = await desktop.checkOnBotJava(baseUrl);
      setConnection(refreshed);
      setMessage(emulatorOrigin
        ? `${uploaded} source file(s) stored in the local mock. No physical robot was changed.`
        : `${uploaded} source file(s) uploaded. Build them on the robot when ready.`);
    } catch (error) {
      setMessage(
        uploaded === files.length
          ? `${uploaded} file(s) uploaded, but connection verification failed: ${formatError(error)}`
          : uploaded
            ? `${uploaded} file(s) uploaded; the next upload failed: ${formatError(error)}`
          : `Upload failed: ${formatError(error)}`,
      );
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  const buildSources = async () => {
    const desktop = window.fieldTelemetryDesktop;
    if (!desktop) return;
    setBusy("build");
    setMessage(emulatorOrigin
      ? "The local mock is returning a canned build result; it will not compile the uploaded sources..."
      : "The Robot Controller is building the uploaded Java sources...");
    setMessageIsError(false);
    setBuildLog("");
    try {
      const result = await desktop.buildOnBotJava(baseUrl);
      setBuildLog(result.log || "(The build endpoint returned an empty log.)");
      if (emulatorOrigin) {
        setMessage("The local mock returned its simulated success result. No Java compilation or FTC SDK validation was performed.");
        setMessageIsError(false);
      } else if (result.outcome === "success") {
        setMessage("Build succeeded according to the Robot Controller build log.");
        setMessageIsError(false);
      } else if (result.outcome === "failure") {
        setMessage("The Robot Controller build log reports a build failure. Review the output below.");
        setMessageIsError(true);
      } else {
        setMessage("The Robot Controller returned a build log, but its result could not be verified. Review the output below.");
        setMessageIsError(false);
      }
    } catch (error) {
      setBuildLog(formatError(error));
      setMessage("The Robot Controller could not complete the build request.");
      setMessageIsError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="robot-code-page">
      <section className="robot-profile-panel panel">
        <header className="robot-profile-heading">
          <div className="robot-profile-icon"><Server size={19} /></div>
          <div>
            <span className="eyebrow">ROBOT FLEET</span>
            <h2>Saved robot profiles</h2>
          </div>
          <span className="robot-profile-count">{profiles.length} / 20</span>
        </header>
        <div className="robot-profile-content">
          <div className="robot-profile-picker">
            <label htmlFor="robot-profile-select">ACTIVE ROBOT</label>
            <select
              id="robot-profile-select"
              value={activeProfile.id}
              onChange={(event) => onSelectProfile(event.target.value)}
              disabled={Boolean(emulatorOrigin)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
            <span>Changing profiles switches telemetry and Program &amp; Manage addresses together.</span>
          </div>
          <div className="robot-profile-fields">
            <label>
              PROFILE NAME
              <input
                value={profileName}
                maxLength={60}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Competition robot"
              />
            </label>
            <label>
              CONTROLLER
              <select
                value={controllerType}
                onChange={(event) => setControllerType(event.target.value as RobotControllerType)}
              >
                <option value="control-hub">Control Hub</option>
                <option value="phone">Android phone</option>
                <option value="other">Other Robot Controller</option>
              </select>
            </label>
            <label>
              TELEMETRY API
              <input
                type="url"
                value={profileTelemetryUrl}
                onChange={(event) => setProfileTelemetryUrl(event.target.value)}
              />
            </label>
            <label>
              PROGRAM &amp; MANAGE
              <input
                type="url"
                value={profileOnBotUrl}
                onChange={(event) => setProfileOnBotUrl(event.target.value)}
              />
            </label>
          </div>
          <div className="robot-profile-actions">
            <button
              className="hard-button button-white"
              type="button"
              onClick={() => saveProfile(false)}
              disabled={busy !== null || Boolean(emulatorOrigin)}
            >
              <Save size={15} /> SAVE PROFILE
            </button>
            <button
              className="hard-button button-yellow"
              type="button"
              onClick={() => {
                if (profiles.length >= 20) {
                  setMessage("A maximum of 20 robot profiles is supported.");
                  setMessageIsError(true);
                  return;
                }
                const trimmedName = profileName.trim();
                const newName = trimmedName &&
                    trimmedName.toLocaleLowerCase() !== activeProfile.name.toLocaleLowerCase()
                  ? trimmedName
                  : `Robot ${profiles.length + 1}`;
                setProfileName(newName);
                onSaveProfile({
                  name: newName,
                  controllerType,
                  telemetryUrl: profileTelemetryUrl,
                  onBotUrl: profileOnBotUrl,
                }, true);
              }}
              disabled={profiles.length >= 20 || busy !== null || Boolean(emulatorOrigin)}
            >
              ADD AS NEW
            </button>
            <button
              className="hard-button button-white"
              type="button"
              onClick={() => {
                if (profiles.length > 1 &&
                    window.confirm(`Remove the ${activeProfile.name} profile?`)) {
                  onDeleteProfile(activeProfile.id);
                }
              }}
              disabled={profiles.length <= 1 || busy !== null || Boolean(emulatorOrigin)}
            >
              DELETE
            </button>
          </div>
        </div>
      </section>

      <section className="robot-code-connect panel">
        <div className="robot-code-connect-copy">
          <span className="eyebrow">PROGRAM &amp; MANAGE · WIFI</span>
          <h2>Connect to OnBotJava</h2>
          <p>
            Your computer and Robot Controller need to be on the same FTC network.
            This app writes source to OnBotJava; it does not start an OpMode.
          </p>
        </div>
        <form className="robot-code-connect-form" onSubmit={(event) => {
          event.preventDefault();
          void checkConnection();
        }}>
          <label htmlFor="onbot-address">ROBOT CONTROLLER ADDRESS</label>
          <div className="robot-code-address-row">
            <input
              id="onbot-address"
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setProfileOnBotUrl(event.target.value);
                setConnection(null);
              }}
              disabled={Boolean(emulatorOrigin)}
              placeholder={DEFAULT_ONBOT_URL}
              required
            />
            <button className="hard-button button-yellow" type="submit" disabled={busy !== null}>
              {busy === "check" ? <RefreshCw className="spin-once" size={16} /> : <Wifi size={16} />}
              {busy === "check" ? "CHECKING" : emulatorOrigin ? "CHECK MOCK" : "CHECK ROBOT"}
            </button>
          </div>
          <small>Control Hub default: {DEFAULT_ONBOT_URL}</small>
        </form>
        {canDeploy && (
          <div className="onbot-emulator-control">
            <div>
              <strong>{emulatorOrigin ? "LOCAL MOCK ACTIVE" : "OFFLINE WORKFLOW TEST"}</strong>
              <span>
                Simulates OnBotJava file-tree, upload, and build routes on this PC.
                Its canned build result does not compile code or verify SDK compatibility.
              </span>
            </div>
            <button
              className={`hard-button ${emulatorOrigin ? "button-white" : "button-yellow"}`}
              type="button"
              onClick={() => void toggleEmulator()}
              disabled={busy !== null}
            >
              {emulatorOrigin ? "STOP LOCAL MOCK" : "START LOCAL MOCK"}
            </button>
          </div>
        )}
      </section>

      <div className="onbot-compat-note">
        <AlertCircle size={17} />
        <span>
          OnBotJava source-upload routes are internal SDK endpoints, not a versioned public API.
          The app probes the live endpoint and reports incompatibilities; support can vary by FTC SDK.
        </span>
      </div>

      {!canDeploy && (
        <div className="onbot-desktop-note" role="note">
          <FolderOpen size={17} />
          <span>
            Project-folder linking, direct robot uploads, and on-robot builds require the installed
            desktop app. Browser mode can still open and edit individual Java files.
          </span>
        </div>
      )}

      {message && (
        <div
          className={`onbot-message ${messageIsError ? "onbot-message-error" : ""}`}
          role={messageIsError ? "alert" : "status"}
          aria-live={messageIsError ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {messageIsError ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{message}</span>
        </div>
      )}

      <section className="robot-code-workspace panel">
        <header className="robot-code-toolbar">
          <div>
            <span className="eyebrow" title={projectRoot}>
              {projectName ? `PROJECT · ${projectName}` : "JAVA WORKSPACE"}
            </span>
            {projectRoot && <small className="robot-code-project-path">{projectRoot}</small>}
            <strong>{files.length ? `${files.length} SOURCE FILE${files.length === 1 ? "" : "S"}` : "NO FILES OPEN"}</strong>
            {dirtyCount > 0 && <small className="robot-code-dirty-summary">{dirtyCount} UNSAVED CHANGE{dirtyCount === 1 ? "" : "S"}</small>}
          </div>
          <div className="robot-code-actions">
            {projectRoot && (
              <button
                className="hard-button button-white"
                type="button"
                onClick={() => void reloadProject()}
                disabled={busy !== null}
              >
                <RefreshCw size={16} /> RELOAD FROM DISK
              </button>
            )}
            <button
              className="hard-button button-white"
              type="button"
              onClick={() => void linkProject()}
              disabled={busy !== null}
            >
              <FolderOpen size={16} /> {projectName ? "CHANGE PROJECT" : "LINK PROJECT"}
            </button>
            {selectedFile?.relativePath && (
              <button
                className="hard-button button-white"
                type="button"
                onClick={() => void saveProjectSource()}
                disabled={busy !== null || selectedFile.savedSource === selectedFile.source}
              >
                <Save size={16} /> SAVE PROJECT FILE
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".java,text/x-java"
              multiple
              hidden
              onChange={(event) => void addFiles(event.currentTarget.files)}
            />
            <button
              className="hard-button button-white"
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy !== null || files.length >= MAX_SOURCE_FILES}
            >
              <FolderOpen size={16} /> OPEN JAVA
            </button>
            <button
              className="hard-button button-white"
              type="button"
              onClick={saveSource}
              disabled={!selectedFile || busy !== null}
            >
              <Download size={16} /> SAVE COPY
            </button>
            <button
              className="hard-button button-yellow"
              type="button"
              onClick={() => setUploadConfirmation(true)}
              disabled={!connection || files.length === 0 || busy !== null || !canDeploy}
            >
              <Upload size={16} /> UPLOAD {files.length ? `(${files.length})` : ""}
            </button>
            <button
              className="hard-button button-red"
              type="button"
              onClick={() => void buildSources()}
              disabled={!connection || pendingCount > 0 || files.length === 0 || busy !== null || !canDeploy}
            >
              <Hammer size={16} /> {busy === "build" ? "BUILDING..." : "BUILD ON ROBOT"}
            </button>
          </div>
        </header>

        {connection && (
          <div className="onbot-connected-strip">
            <CheckCircle2 size={16} />
            <span>CONNECTED · {connection.sourceFiles} REMOTE SOURCE FILES</span>
            <strong>{hostFor(baseUrl)}</strong>
          </div>
        )}

        {connection?.sourcePaths && (
          <section className="onbot-remote-files" aria-label="Remote OnBotJava source files">
            <div className="onbot-remote-files-heading">
              <span className="eyebrow">REMOTE JAVA SOURCES</span>
              <span>{connection.sourcePaths.length}</span>
            </div>
            {connection.sourcePaths.length ? (
              <ul>
                {connection.sourcePaths.map((sourcePath) => (
                  <li key={sourcePath}>{sourcePath}</li>
                ))}
              </ul>
            ) : (
              <p>No remote source paths were reported by the Robot Controller.</p>
            )}
          </section>
        )}

        {uploadConfirmation && (
          <div className="onbot-confirm-upload" role="alert">
            <div>
              <strong>Upload and replace matching robot files?</strong>
              <span>
                {files.length} Java file(s) will be written to {hostFor(baseUrl)}.
                OnBotJava places each file using its declared package.
              </span>
              {remoteOverwritePaths === null ? (
                <span className="onbot-overwrite-warning">
                  Remote paths could not be inspected. The existing-file conflict check is unavailable.
                </span>
              ) : remoteOverwritePaths.length > 0 ? (
                <span className="onbot-overwrite-warning">
                  {remoteOverwritePaths.length} matching remote file(s) will be replaced: {remoteOverwritePaths.join(", ")}
                </span>
              ) : (
                <span>No matching remote files were found in the last source-tree check.</span>
              )}
            </div>
            <div className="onbot-confirm-actions">
              <button className="hard-button button-white" onClick={() => setUploadConfirmation(false)}>
                <X size={15} /> CANCEL
              </button>
              <button className="hard-button button-red" onClick={() => void uploadSources()}>
                <Upload size={15} /> CONFIRM UPLOAD
              </button>
            </div>
          </div>
        )}

        <div className="robot-code-editor-layout">
          <aside className="robot-code-files" aria-label="Open Java files">
            <div className="robot-code-files-heading">
              <span className="eyebrow">{projectName ? "PROJECT FILES" : "OPEN FILES"}</span>
              <span>{files.length.toString().padStart(2, "0")}</span>
            </div>
            {files.length ? (
              <nav className="robot-code-tree" aria-label="Java project files">
                <ul className="robot-code-tree-list">
                  {projectTree.children.map((node) => {
                  const renderNode = (treeNode: ProjectTreeNode, depth: number): React.ReactNode => {
                    if (treeNode.file) {
                      const file = treeNode.file;
                      const dirty = hasUnsavedChanges(file);
                      const uploaded = file.uploadedSource === file.source;
                      return (
                        <li className="robot-code-tree-item" key={file.id}>
                          <button
                            className={`robot-code-file ${file.id === selectedId ? "robot-code-file-active" : ""}`}
                            aria-current={file.id === selectedId ? "page" : undefined}
                            style={{ paddingLeft: `${11 + depth * 15}px` }}
                            onClick={() => setSelectedId(file.id)}
                          >
                            <FileCode2 size={15} aria-hidden="true" />
                            <span>
                              <strong>{treeNode.name}</strong>
                              <small>{dirty ? "UNSAVED CHANGES" : uploaded ? "UPLOADED TO ROBOT" : file.relativePath ?? "OPENED LOCALLY"}</small>
                            </span>
                            <span
                              className={`robot-code-file-status ${dirty ? "robot-code-file-dirty" : uploaded ? "robot-code-file-uploaded" : ""}`}
                              role="img"
                              aria-label={dirty ? "Unsaved changes" : uploaded ? "Uploaded" : "Not uploaded"}
                            />
                          </button>
                        </li>
                      );
                    }
                    const expanded = !collapsedFolders.has(treeNode.path);
                    return (
                      <li className="robot-code-tree-folder" key={treeNode.path}>
                        <button
                          className="robot-code-tree-folder-button"
                          aria-expanded={expanded}
                          style={{ paddingLeft: `${11 + depth * 15}px` }}
                          onClick={() => setCollapsedFolders((current) => {
                            const next = new Set(current);
                            if (next.has(treeNode.path)) next.delete(treeNode.path);
                            else next.add(treeNode.path);
                            return next;
                          })}
                        >
                          {expanded ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
                          <Folder size={14} aria-hidden="true" />
                          <span>{treeNode.name}</span>
                        </button>
                        {expanded && (
                          <ul className="robot-code-tree-list">
                            {treeNode.children.map((child) => renderNode(child, depth + 1))}
                          </ul>
                        )}
                      </li>
                    );
                  };
                  return renderNode(node, 0);
                  })}
                </ul>
              </nav>
            ) : (
              <div className="robot-code-empty-files">
                <Code2 size={23} />
                <span>Open one or more Java files to begin.</span>
              </div>
            )}
            {connection && (
              <div className="robot-code-file-count">
                {connection.allowExternalLibraries
                  ? "EXTERNAL LIBRARIES AVAILABLE ON ROBOT"
                  : "JAVA SOURCE MODE"}
              </div>
            )}
          </aside>

          <div className="robot-code-editor-column">
            {selectedFile ? (
              <>
                <div className="robot-code-file-heading">
                  <div>
                    <FileCode2 size={17} />
                    <strong>{selectedFile.name}</strong>
                    <span>{selectedPackage}</span>
                  </div>
                  {selectedFile.uploadedSource === selectedFile.source
                    ? <span className="source-state source-uploaded"><CheckCircle2 size={14} /> ON ROBOT</span>
                    : !hasUnsavedChanges(selectedFile)
                      ? <span className="source-state source-uploaded">{selectedFile.relativePath ? "SAVED LOCALLY" : "OPENED LOCALLY"}</span>
                      : <span className="source-state source-local">LOCAL CHANGES</span>}
                </div>
                <CodeMirror
                  value={selectedFile.source}
                  height="520px"
                  extensions={[java()]}
                  onChange={updateSource}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    autocompletion: true,
                  }}
                  aria-label={`Java editor for ${selectedFile.name}`}
                />
              </>
            ) : (
              <div className="robot-code-editor-placeholder">
                <Code2 size={34} />
                <h3>Your robot code workspace</h3>
                <p>Open Java source to edit it here, then upload it over the FTC Wi-Fi network.</p>
                <button
                  className="hard-button button-yellow"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <FolderOpen size={16} /> OPEN JAVA FILES
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {buildLog && (
        <section className="robot-code-build panel" aria-labelledby="robot-build-log-title">
          <header>
            <div>
              <span className="eyebrow">ROBOT CONTROLLER OUTPUT</span>
              <h2 id="robot-build-log-title">Build log</h2>
            </div>
            <span className="onbot-build-host">{hostFor(baseUrl)}</span>
          </header>
          <pre>{buildLog}</pre>
        </section>
      )}
    </div>
  );
}
