import type { RobotControllerType, RobotProfile } from "./types";

export const ROBOT_PROFILES_KEY = "field-telemetry-robot-profiles";
export const ACTIVE_ROBOT_PROFILE_KEY = "field-telemetry-active-robot-profile";
export const DEFAULT_TELEMETRY_URL = "http://192.168.43.1:8765";
export const DEFAULT_ONBOT_URL = "http://192.168.43.1:8080";

export interface RobotProfileState {
  profiles: RobotProfile[];
  activeId: string;
  error: string | null;
}

const CONTROLLER_TYPES = new Set<RobotControllerType>(["control-hub", "phone", "other"]);

function isOrigin(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username && !url.password && !url.search && !url.hash &&
      (url.pathname === "/" || url.pathname === "");
  } catch {
    return false;
  }
}

export function normalizeRobotOrigin(value: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS address.`);
  }
  if (!["http:", "https:"].includes(url.protocol) ||
      url.username || url.password || url.search || url.hash ||
      (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error(`${label} must be an HTTP or HTTPS origin, without a path or credentials.`);
  }
  return url.origin;
}

function isProfile(value: unknown): value is RobotProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === "string" && profile.id.length > 0 && profile.id.length <= 100 &&
    typeof profile.name === "string" && profile.name.trim().length > 0 && profile.name.length <= 60 &&
    CONTROLLER_TYPES.has(profile.controllerType as RobotControllerType) &&
    isOrigin(profile.telemetryUrl) && isOrigin(profile.onBotUrl);
}

export function readRobotProfileState(
  storage: Pick<Storage, "getItem">,
  legacyTelemetryUrl = DEFAULT_TELEMETRY_URL,
  legacyOnBotUrl = DEFAULT_ONBOT_URL,
): RobotProfileState {
  try {
    const savedProfiles = storage.getItem(ROBOT_PROFILES_KEY);
    if (savedProfiles === null) {
      const defaultProfile: RobotProfile = {
        id: "default-robot",
        name: "FTC Robot",
        controllerType: "control-hub",
        telemetryUrl: isOrigin(legacyTelemetryUrl)
          ? new URL(legacyTelemetryUrl).origin
          : DEFAULT_TELEMETRY_URL,
        onBotUrl: isOrigin(legacyOnBotUrl)
          ? new URL(legacyOnBotUrl).origin
          : DEFAULT_ONBOT_URL,
      };
      return { profiles: [defaultProfile], activeId: defaultProfile.id, error: null };
    }

    const parsed: unknown = JSON.parse(savedProfiles);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 20 ||
        !parsed.every(isProfile)) {
      throw new Error("Saved robot profiles have an invalid format.");
    }
    const profiles = parsed.map((profile) => ({
      ...profile,
      name: profile.name.trim(),
      telemetryUrl: new URL(profile.telemetryUrl).origin,
      onBotUrl: new URL(profile.onBotUrl).origin,
    }));
    const savedActive = storage.getItem(ACTIVE_ROBOT_PROFILE_KEY);
    const activeId = profiles.some((profile) => profile.id === savedActive)
      ? savedActive!
      : profiles[0].id;
    return { profiles, activeId, error: null };
  } catch (error) {
    const fallback: RobotProfile = {
      id: "default-robot",
      name: "FTC Robot",
      controllerType: "control-hub",
      telemetryUrl: DEFAULT_TELEMETRY_URL,
      onBotUrl: DEFAULT_ONBOT_URL,
    };
    return {
      profiles: [fallback],
      activeId: fallback.id,
      error: error instanceof Error
        ? `Saved robot profiles could not be loaded: ${error.message}`
        : "Saved robot profiles could not be loaded.",
    };
  }
}

export function persistRobotProfileState(
  storage: Pick<Storage, "setItem">,
  profiles: RobotProfile[],
  activeId: string,
): void {
  if (profiles.length === 0 || profiles.length > 20 || !profiles.every(isProfile) ||
      !profiles.some((profile) => profile.id === activeId)) {
    throw new Error("Robot profile data is invalid.");
  }
  storage.setItem(ROBOT_PROFILES_KEY, JSON.stringify(profiles));
  storage.setItem(ACTIVE_ROBOT_PROFILE_KEY, activeId);
}
