import type { FastifyInstance } from "fastify";
import type { DashboardConfig, DashboardWidget, DashboardEntry, GridConfig, AppConfig } from "@homecontrol/shared";
import { readFile, writeFile, mkdir, unlink, access, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { readConfig, writeConfig } from "./config.js";
import type { LiveChartBufferService } from "../services/LiveChartBufferService.js";
import { rtspUrlToStreamName, registerGo2rtcStream } from "./go2rtc.js";

const DATA_DIR = process.env.DATA_DIR ?? resolve(import.meta.dirname, "../../../..");
const OLD_DASHBOARD_PATH = resolve(DATA_DIR, "dashboard.json");
const DASHBOARDS_DIR = resolve(DATA_DIR, "dashboards");

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

async function readDashboardById(id: string): Promise<DashboardConfig> {
  try {
    const raw = await readFile(getDashboardPath(id), "utf-8");
    return JSON.parse(raw) as DashboardConfig;
  } catch {
    return { widgets: [] };
  }
}

async function writeDashboardById(id: string, config: DashboardConfig): Promise<void> {
  await mkdir(DASHBOARDS_DIR, { recursive: true });
  await writeFile(getDashboardPath(id), JSON.stringify(config, null, 2), "utf-8");
}

async function writeDashboard(config: DashboardConfig): Promise<void> {
  await mkdir(DASHBOARDS_DIR, { recursive: true });
  const path = await getActiveDashboardPath();
  await writeFile(path, JSON.stringify(config, null, 2), "utf-8");
}

/** Collect all camera RTSP URLs from widgets (including container children) */
function collectCameraUrls(widgets: DashboardWidget[]): string[] {
  const urls: string[] = [];
  for (const w of widgets) {
    if (w.type === "camera" && w.config.rtspUrl) {
      urls.push(w.config.rtspUrl);
    }
    if (w.type === "container") {
      urls.push(...collectCameraUrls(w.config.widgets));
    }
  }
  return urls;
}

/** Register all camera streams from a dashboard config with go2rtc */
async function syncCameraStreams(config: DashboardConfig): Promise<void> {
  const urls = collectCameraUrls(config.widgets);
  const seen = new Set<string>();
  for (const url of urls) {
    const name = rtspUrlToStreamName(url);
    if (seen.has(name)) continue;
    seen.add(name);
    registerGo2rtcStream(name, url).catch(() => {});
  }
}

export function registerDashboardRoutes(app: FastifyInstance, liveChartBuffer: LiveChartBufferService) {
  // Run migration before registering routes, then sync camera streams
  app.addHook("onReady", async () => {
    await migrate();
    try {
      const dashboard = await readDashboard();
      syncCameraStreams(dashboard).catch(() => {});
    } catch { /* ignore — dashboard may not exist yet */ }
  });

  app.get("/api/dashboard", async () => {
    const dashboard = await readDashboard();
    // Fall back to global grid config if this dashboard doesn't have its own
    if (!dashboard.grid) {
      const config = await readConfig();
      dashboard.grid = config.grid;
    }
    return dashboard;
  });

  app.put<{ Body: DashboardConfig }>("/api/dashboard", async (request) => {
    const config = request.body;
    await writeDashboard(config);
    syncCameraStreams(config).catch(() => {});
    liveChartBuffer.rescan().catch(() => {});
    return { success: true };
  });

  // Read a specific dashboard by ID
  app.get<{ Params: { id: string } }>("/api/dashboard/:id", async (request) => {
    return readDashboardById(request.params.id);
  });

  // Create a new dashboard
  app.post<{ Body: { name: string; icon?: string } }>("/api/dashboards", async (request) => {
    const { name, icon } = request.body;
    const id = randomUUID();
    const config = await readConfig();
    const entry: DashboardEntry = { id, name, ...(icon ? { icon } : {}) };
    config.dashboards.push(entry);
    await writeConfig(config);
    await writeDashboardById(id, { widgets: [] });
    liveChartBuffer.rescan().catch(() => {});
    return entry;
  });

  // Update a dashboard entry (name/icon)
  app.put<{ Params: { id: string }; Body: { name?: string; icon?: string } }>("/api/dashboards/:id", async (request) => {
    const { id } = request.params;
    const { name, icon } = request.body;
    const config = await readConfig();
    const entry = config.dashboards.find((d) => d.id === id);
    if (!entry) return { error: "Dashboard not found" };
    if (name !== undefined) entry.name = name;
    if (icon !== undefined) entry.icon = icon || undefined;
    await writeConfig(config);
    return entry;
  });

  // Delete a dashboard
  app.delete<{ Params: { id: string } }>("/api/dashboards/:id", async (request) => {
    const { id } = request.params;
    const config = await readConfig();
    if (config.dashboards.length <= 1) {
      return { error: "Cannot delete the last dashboard" };
    }
    config.dashboards = config.dashboards.filter((d) => d.id !== id);
    // If deleting the active dashboard, switch to the first remaining one
    if (config.activeDashboardId === id) {
      config.activeDashboardId = config.dashboards[0].id;
    }
    await writeConfig(config);
    // Remove dashboard file
    try { await unlink(getDashboardPath(id)); } catch { /* ignore */ }
    liveChartBuffer.rescan().catch(() => {});
    return { success: true, activeDashboardId: config.activeDashboardId };
  });

  // Switch active dashboard
  app.post<{ Params: { id: string } }>("/api/dashboards/switch/:id", async (request) => {
    const { id } = request.params;
    const config = await readConfig();
    const entry = config.dashboards.find((d) => d.id === id);
    if (!entry) return { error: "Dashboard not found" };
    config.activeDashboardId = id;
    await writeConfig(config);
    const dashboard = await readDashboardById(id);
    // Fall back to global grid config if this dashboard doesn't have its own
    if (!dashboard.grid) {
      dashboard.grid = config.grid;
    }
    return { activeDashboardId: id, dashboard };
  });

  // Move widget between dashboards
  app.post<{ Body: { widgetId: string; targetDashboardId: string } }>("/api/dashboards/move-widget", async (request) => {
    const { widgetId, targetDashboardId } = request.body;
    const config = await readConfig();

    // Read source (active) dashboard
    const sourceDashboard = await readDashboard();
    const widgetIndex = sourceDashboard.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) return { error: "Widget not found" };

    // Remove from source
    const [widget] = sourceDashboard.widgets.splice(widgetIndex, 1);
    await writeDashboard(sourceDashboard);

    // Add to target
    const targetDashboard = await readDashboardById(targetDashboardId);
    widget.position = { col: 1, row: 1 };
    targetDashboard.widgets.push(widget);
    await writeDashboardById(targetDashboardId, targetDashboard);

    liveChartBuffer.rescan().catch(() => {});
    return { success: true };
  });

  // Export full backup (config + all dashboards)
  app.get("/api/backup", async () => {
    const config = await readConfig();
    const dashboards: Record<string, DashboardConfig> = {};
    for (const entry of config.dashboards) {
      dashboards[entry.id] = await readDashboardById(entry.id);
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      config,
      dashboards,
      deviceOverrides: config.deviceOverrides ?? {},
    };
  });

  // Restore from backup
  app.post<{
    Body: {
      version: number;
      config: AppConfig;
      dashboards: Record<string, DashboardConfig>;
      deviceOverrides?: Record<string, string>;
    };
  }>("/api/restore", async (request, reply) => {
    const { version, config, dashboards, deviceOverrides } = request.body;

    if (!version || !config || !dashboards) {
      return reply.status(400).send({ error: "Invalid backup format" });
    }
    if (!config.dashboards || !config.activeDashboardId) {
      return reply.status(400).send({ error: "Invalid config in backup" });
    }

    // Remove existing dashboard files
    try {
      const files = await readdir(DASHBOARDS_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          await unlink(resolve(DASHBOARDS_DIR, file));
        }
      }
    } catch {
      // Directory may not exist yet
    }

    // Write all dashboard files
    for (const [id, dashboard] of Object.entries(dashboards)) {
      await writeDashboardById(id, dashboard);
    }

    // Write config (include device overrides if present)
    if (deviceOverrides) {
      config.deviceOverrides = deviceOverrides;
    }
    await writeConfig(config);

    liveChartBuffer.rescan().catch(() => {});
    return { success: true };
  });
}
