import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";

// Load .env from monorepo root regardless of working directory
dotenvConfig({ path: resolve(import.meta.dirname, "../../../.env") });

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  homeyAddress: process.env.HOMEY_ADDRESS ?? "",
  homeyToken: process.env.HOMEY_TOKEN ?? "",
  go2rtcUrl: process.env.GO2RTC_URL ?? "http://localhost:1984",
} as const;

export function validateConfig() {
  if (!config.homeyAddress) {
    throw new Error("HOMEY_ADDRESS is required in .env");
  }
  if (!config.homeyToken) {
    throw new Error("HOMEY_TOKEN is required in .env");
  }
}
