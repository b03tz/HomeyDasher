import type { FastifyInstance } from "fastify";
import type { DashboardConfig } from "@homecontrol/shared";
import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { readConfig, writeConfig } from "./config.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const OLD_DASHBOARD_PATH = resolve(ROOT, "dashboard.json");
const DASHBOARDS_DIR = resolve(ROOT, "dashboards");

function getDashboardPath(id: string): string {
  return resolve(DASHBOARDS_DIR, `${id}.json`);
}

async function getActiveDashboardPath(): Promise<string> {
  const config = await readConfig();
  return getDashboardPath(config.activeDashboardId);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function migrate(): Promise<void> {
  if (!(await fileExists(OLD_DASHBOARD_PATH))) return;

  // Read old dashboard
  let oldData: DashboardConfig;
  try {
    const raw = await readFile(OLD_DASHBOARD_PATH, "utf-8");
    oldData = JSON.parse(raw) as DashboardConfig;
  } catch {
    oldData = { widgets: [] };
  }

  // Generate UUID for the default dashboard
  const id = randomUUID();

  // Ensure dashboards directory exists
  await mkdir(DASHBOARDS_DIR, { recursive: true });

  // Write per-dashboard file
  await writeFile(
    getDashboardPath(id),
    JSON.stringify(oldData, null, 2),
    "utf-8"
  );

  // Write global config
  await writeConfig({
    grid: { columns: 12, rows: 12 },
    dashboards: [{ id, name: "Main Dashboard" }],
    activeDashboardId: id,
  });

  // Remove old file
  await unlink(OLD_DASHBOARD_PATH);

  console.log(`Migrated dashboard.json → dashboards/${id}.json`);
}

async function readDashboard(): Promise<DashboardConfig> {
  try {
    const path = await getActiveDashboardPath();
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as DashboardConfig;
  } catch {
    return { widgets: [] };
  }
}

async function writeDashboard(config: DashboardConfig): Promise<void> {
  await mkdir(DASHBOARDS_DIR, { recursive: true });
  const path = await getActiveDashboardPath();
  await writeFile(path, JSON.stringify(config, null, 2), "utf-8");
}

export function registerDashboardRoutes(app: FastifyInstance) {
  // Run migration before registering routes
  app.addHook("onReady", async () => {
    await migrate();
  });

  app.get("/api/dashboard", async () => {
    return readDashboard();
  });

  app.put<{ Body: DashboardConfig }>("/api/dashboard", async (request) => {
    const config = request.body;
    await writeDashboard(config);
    return { success: true };
  });
}
