import type { FastifyInstance } from "fastify";
import type { AppConfig } from "@homecontrol/shared";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const CONFIG_PATH = resolve(import.meta.dirname, "../../../../config.json");

function defaultConfig(): AppConfig {
  const id = randomUUID();
  return {
    grid: { columns: 12, rows: 12 },
    dashboards: [{ id, name: "Main Dashboard" }],
    activeDashboardId: id,
  };
}

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return defaultConfig();
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
}
