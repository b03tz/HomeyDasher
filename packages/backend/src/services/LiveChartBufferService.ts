import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DashboardConfig, DashboardWidget, LiveChartWidget } from "@homecontrol/shared";
import type { HomeyService } from "./HomeyService.js";

interface DataPoint {
  t: number;
  v: number;
}

interface TrackedPair {
  deviceId: string;
  capabilityId: string;
  maxPeriodMs: number;
}

const DATA_DIR = process.env.DATA_DIR ?? resolve(import.meta.dirname, "../../../..");
const DASHBOARDS_DIR = resolve(DATA_DIR, "dashboards");
const TRIM_INTERVAL = 60_000; // trim stale data every 60s

const PERIOD_MS: Record<string, number> = {
  last1Min: 60_000,
  last5Min: 5 * 60_000,
  last30Min: 30 * 60_000,
  lastHour: 60 * 60_000,
};

function bufferKey(deviceId: string, capabilityId: string): string {
  return `${deviceId}::${capabilityId}`;
}

export class LiveChartBufferService {
  private homey: HomeyService;
  private buffers = new Map<string, DataPoint[]>();
  private tracked = new Map<string, TrackedPair>();
  private trimTimer: ReturnType<typeof setInterval> | null = null;
  private boundOnCapability: (payload: { deviceId: string; capabilityId: string; value: unknown }) => void;

  constructor(homey: HomeyService) {
    this.homey = homey;
    this.boundOnCapability = this.onCapabilityUpdated.bind(this);
  }

  async initialize(): Promise<void> {
    await this.rescan();
    this.homey.on("capability:updated", this.boundOnCapability);
    this.trimTimer = setInterval(() => this.trimAll(), TRIM_INTERVAL);
    console.log(`LiveChartBuffer: tracking ${this.tracked.size} capability pairs`);
  }

  async rescan(): Promise<void> {
    const pairs = await this.scanDashboards();

    // Build new tracked map, merging max periods for duplicate pairs
    const newTracked = new Map<string, TrackedPair>();
    for (const pair of pairs) {
      const key = bufferKey(pair.deviceId, pair.capabilityId);
      const existing = newTracked.get(key);
      if (existing) {
        existing.maxPeriodMs = Math.max(existing.maxPeriodMs, pair.maxPeriodMs);
      } else {
        newTracked.set(key, { ...pair });
      }
    }

    // Remove buffers that are no longer tracked
    for (const key of this.tracked.keys()) {
      if (!newTracked.has(key)) {
        this.buffers.delete(key);
      }
    }

    this.tracked = newTracked;
    console.log(`LiveChartBuffer: rescan complete, tracking ${this.tracked.size} pairs`);
  }

  getHistory(deviceId: string, capabilityId: string, periodMs: number): DataPoint[] {
    const key = bufferKey(deviceId, capabilityId);
    const buffer = this.buffers.get(key);
    if (!buffer) return [];
    const cutoff = Date.now() - periodMs;
    return buffer.filter((p) => p.t >= cutoff);
  }

  destroy(): void {
    this.homey.off("capability:updated", this.boundOnCapability);
    if (this.trimTimer) {
      clearInterval(this.trimTimer);
      this.trimTimer = null;
    }
  }

  private onCapabilityUpdated(payload: { deviceId: string; capabilityId: string; value: unknown }): void {
    const key = bufferKey(payload.deviceId, payload.capabilityId);
    if (!this.tracked.has(key)) return;

    const v = Number(payload.value);
    if (isNaN(v)) return;

    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = [];
      this.buffers.set(key, buffer);
    }
    buffer.push({ t: Date.now(), v });
  }

  private trimAll(): void {
    const now = Date.now();
    for (const [key, pair] of this.tracked) {
      const buffer = this.buffers.get(key);
      if (!buffer) continue;
      const cutoff = now - pair.maxPeriodMs;
      // Find first index to keep (buffer is chronologically ordered)
      let keepFrom = 0;
      while (keepFrom < buffer.length && buffer[keepFrom].t < cutoff) {
        keepFrom++;
      }
      if (keepFrom > 0) {
        buffer.splice(0, keepFrom);
      }
    }
  }

  private async scanDashboards(): Promise<TrackedPair[]> {
    const pairs: TrackedPair[] = [];

    let files: string[];
    try {
      files = await readdir(DASHBOARDS_DIR);
    } catch {
      return pairs;
    }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(resolve(DASHBOARDS_DIR, file), "utf-8");
        const dashboard = JSON.parse(raw) as DashboardConfig;
        this.extractFromWidgets(dashboard.widgets, pairs);
      } catch {
        // Skip malformed dashboard files
      }
    }

    return pairs;
  }

  private extractFromWidgets(widgets: DashboardWidget[], pairs: TrackedPair[]): void {
    for (const widget of widgets) {
      if (widget.type === "live-chart") {
        const cfg = (widget as LiveChartWidget).config;
        const periodMs = PERIOD_MS[cfg.period] ?? 60_000;

        pairs.push({
          deviceId: cfg.deviceId,
          capabilityId: cfg.capabilityId,
          maxPeriodMs: periodMs,
        });

        if (cfg.secondary) {
          pairs.push({
            deviceId: cfg.secondary.deviceId,
            capabilityId: cfg.secondary.capabilityId,
            maxPeriodMs: periodMs,
          });
        }
      } else if (widget.type === "container") {
        // Recurse into container children
        const containerCfg = (widget as any).config;
        if (containerCfg?.widgets) {
          this.extractFromWidgets(containerCfg.widgets, pairs);
        }
      }
    }
  }
}
