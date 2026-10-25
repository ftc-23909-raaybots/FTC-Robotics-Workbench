import driveDashboard from "../../resources/dashboards/drive.json";
import robotHealthDashboard from "../../resources/dashboards/robot-health.json";
import autonomousDashboard from "../../resources/dashboards/autonomous.json";
import type { DashboardDefinition } from "./types";

export const dashboardDefinitions: DashboardDefinition[] = [
  driveDashboard,
  robotHealthDashboard,
  autonomousDashboard,
];
