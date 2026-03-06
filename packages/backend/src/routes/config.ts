import type { FastifyInstance } from "fastify";
import type { AppConfig } from "@homecontrol/shared";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = process.env.DATA_DIR ?? resolve(import.meta.dirname, "../../../..");
const CONFIG_PATH = resolve(DATA_DIR, "config.json");
const DASHBOARDS_DIR = resolve(DATA_DIR, "dashboards");

function defaultConfig(): AppConfig {
  const id = randomUUID();
  return {
    grid: { columns: 12, rows: 12 },
    dashboards: [{ id, name: "Main Dashboard" }],
    activeDashboardId: id,
  };
}

/** Cached init promise to prevent concurrent defaultConfig() races */
let initPromise: Promise<AppConfig> | null = null;

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    // First boot — persist the default config AND create the initial dashboard file
    // Use a cached promise so concurrent calls don't each generate different UUIDs
    if (!initPromise) {
      initPromise = (async () => {
        const config = defaultConfig();
        await mkdir(DASHBOARDS_DIR, { recursive: true });
        await writeConfig(config);
        // Create empty dashboard file for the default dashboard
        const dashPath = resolve(DASHBOARDS_DIR, `${config.activeDashboardId}.json`);
        await writeFile(dashPath, JSON.stringify({ widgets: [] }, null, 2), "utf-8");
        return config;
      })();
    }
    return initPromise;
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function registerConfigRoutes(app: FastifyInstance) {
  app.get("/api/config", async () => {
    return readConfig();
  });

  app.put<{ Body: AppConfig }>("/api/config", async (request) => {
    const config = request.body;
    await writeConfig(config);
    return { success: true };
  });

  app.get("/api/device-overrides", async () => {
    const config = await readConfig();
    return config.deviceOverrides ?? {};
  });

  app.put<{ Body: Record<string, string> }>("/api/device-overrides", async (request) => {
    const config = await readConfig();
    config.deviceOverrides = request.body;
    await writeConfig(config);
    return { success: true };
  });
}
