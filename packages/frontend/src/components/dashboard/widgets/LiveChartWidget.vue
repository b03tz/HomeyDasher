<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import type { LiveChartWidget as LiveChartWidgetType } from "@homecontrol/shared";
import { useSocket } from "../../../composables/useSocket";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const props = defineProps<{
  widget: LiveChartWidgetType;
}>();

interface DataPoint {
  t: number;
  v: number;
}

const PERIOD_MS: Record<string, number> = {
  last1Min: 60_000,
  last5Min: 5 * 60_000,
  last30Min: 30 * 60_000,
  lastHour: 60 * 60_000,
};

const INTERVAL_MS: Record<string, number> = {
  "2s": 2_000,
  "5s": 5_000,
  "10s": 10_000,
  "30s": 30_000,
  "1min": 60_000,
};

const primaryData = ref<DataPoint[]>([]);
const secondaryData = ref<DataPoint[]>([]);

// Latest known values (updated on every socket event, used by interval sampling)
let latestPrimary: number | null = null;
let latestSecondary: number | null = null;

const { socket } = useSocket();

function periodMs(): number {
  return PERIOD_MS[props.widget.config.period] ?? 60_000;
}

function trimData(arr: DataPoint[]): DataPoint[] {
  const cutoff = Date.now() - periodMs();
  return arr.filter((p) => p.t >= cutoff);
}

function isLiveMode(): boolean {
  const interval = props.widget.config.updateInterval;
  return !interval || interval === "live";
}

function pushPrimary(v: number) {
  primaryData.value = [...trimData(primaryData.value), { t: Date.now(), v }];
}

function pushSecondary(v: number) {
  secondaryData.value = [...trimData(secondaryData.value), { t: Date.now(), v }];
}

function onCapabilityUpdated(payload: { deviceId: string; capabilityId: string; value: unknown }) {
  const cfg = props.widget.config;

  if (payload.deviceId === cfg.deviceId && payload.capabilityId === cfg.capabilityId) {
    const multiplier = cfg.multiplier ?? 1;
    const v = Number(payload.value) * multiplier;
    if (!isNaN(v)) {
      latestPrimary = v;
      if (isLiveMode()) pushPrimary(v);
    }
  }

  if (
    cfg.secondary &&
    payload.deviceId === cfg.secondary.deviceId &&
    payload.capabilityId === cfg.secondary.capabilityId
  ) {
    const multiplier = cfg.secondary.multiplier ?? 1;
    const v = Number(payload.value) * multiplier;
    if (!isNaN(v)) {
      latestSecondary = v;
      if (isLiveMode()) pushSecondary(v);
    }
  }
}

function sampleTick() {
  if (latestPrimary === null || latestSecondary === null) seedFromStore();
  if (latestPrimary !== null) pushPrimary(latestPrimary);
  if (latestSecondary !== null) pushSecondary(latestSecondary);
}

let trimInterval: ReturnType<typeof setInterval> | null = null;
let sampleInterval: ReturnType<typeof setInterval> | null = null;

function seedFromStore() {
  const cfg = props.widget.config;
  const deviceStore = useDeviceStore();

  const primaryDev = deviceStore.devices[cfg.deviceId];
  const primaryCap = primaryDev?.capabilities[cfg.capabilityId];
  if (primaryCap != null) {
    const v = Number(primaryCap.value) * (cfg.multiplier ?? 1);
    if (!isNaN(v)) latestPrimary = v;
  }

  if (cfg.secondary) {
    const secDev = deviceStore.devices[cfg.secondary.deviceId];
    const secCap = secDev?.capabilities[cfg.secondary.capabilityId];
    if (secCap != null) {
      const v = Number(secCap.value) * (cfg.secondary.multiplier ?? 1);
      if (!isNaN(v)) latestSecondary = v;
    }
  }
}

function onHistoryReceived(payload: { deviceId: string; capabilityId: string; points: { t: number; v: number }[] }) {
  const cfg = props.widget.config;

  if (payload.deviceId === cfg.deviceId && payload.capabilityId === cfg.capabilityId) {
    const multiplier = cfg.multiplier ?? 1;
    const existing = new Set(primaryData.value.map((p) => p.t));
    const merged = [
      ...primaryData.value,
      ...payload.points
        .filter((p) => !existing.has(p.t))
        .map((p) => ({ t: p.t, v: p.v * multiplier })),
    ].sort((a, b) => a.t - b.t);
    primaryData.value = trimData(merged);
  }

  if (
    cfg.secondary &&
    payload.deviceId === cfg.secondary.deviceId &&
    payload.capabilityId === cfg.secondary.capabilityId
  ) {
    const multiplier = cfg.secondary.multiplier ?? 1;
    const existing = new Set(secondaryData.value.map((p) => p.t));
    const merged = [
      ...secondaryData.value,
      ...payload.points
        .filter((p) => !existing.has(p.t))
        .map((p) => ({ t: p.t, v: p.v * multiplier })),
    ].sort((a, b) => a.t - b.t);
    secondaryData.value = trimData(merged);
  }
}

onMounted(() => {
  seedFromStore();
  socket.on("capability:updated", onCapabilityUpdated);
  socket.on("livechart:history", onHistoryReceived);

  // Request historical data from server buffer
  const cfg = props.widget.config;
  const period = periodMs();
  socket.emit("livechart:request-history", {
    deviceId: cfg.deviceId,
    capabilityId: cfg.capabilityId,
    periodMs: period,
  });
  if (cfg.secondary) {
    socket.emit("livechart:request-history", {
      deviceId: cfg.secondary.deviceId,
      capabilityId: cfg.secondary.capabilityId,
      periodMs: period,
    });
  }

  trimInterval = setInterval(() => {
    primaryData.value = trimData(primaryData.value);
    secondaryData.value = trimData(secondaryData.value);
  }, 5000);

  // Start sampling interval if not in live mode
  const intervalMs = INTERVAL_MS[props.widget.config.updateInterval ?? ""];
  if (intervalMs) {
    sampleInterval = setInterval(sampleTick, intervalMs);
  }
});

onUnmounted(() => {
  socket.off("capability:updated", onCapabilityUpdated);
  socket.off("livechart:history", onHistoryReceived);
  if (trimInterval) clearInterval(trimInterval);
  if (sampleInterval) clearInterval(sampleInterval);
});

const hasData = computed(() => primaryData.value.length > 0 || secondaryData.value.length > 0);
const hasSecondary = computed(() => !!props.widget.config.secondary);

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const chartData = computed(() => {
  const cfg = props.widget.config;
  const primaryColor = cfg.color || "#4fc3f7";
  const primaryNegColor = cfg.negativeColor || "#ef5350";

  // Merge timestamps from both datasets
  const tsSet = new Set<number>();
  primaryData.value.forEach((p) => tsSet.add(p.t));
  secondaryData.value.forEach((p) => tsSet.add(p.t));
  const allTimestamps = [...tsSet].sort((a, b) => a - b);

  const labels = allTimestamps.map(formatTime);

  // Build primary data array aligned to merged timestamps
  const primaryMap = new Map(primaryData.value.map((p) => [p.t, p.v]));
  const primaryValues = allTimestamps.map((ts) => primaryMap.get(ts) ?? null);

  const datasets: any[] = [
    {
      label: cfg.unit ? `Primary (${cfg.unit})` : "Primary",
      data: primaryValues,
      borderColor: primaryColor,
      backgroundColor: hexToRgba(primaryColor, 0.1),
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      fill: !hasSecondary.value,
      tension: 0.3,
      spanGaps: true,
      yAxisID: "y",
      segment: {
        borderColor: (ctx: any) => {
          const p0 = ctx.p0?.parsed?.y;
          const p1 = ctx.p1?.parsed?.y;
          if ((p0 != null && p0 < 0) || (p1 != null && p1 < 0)) {
            return primaryNegColor;
          }
          return undefined;
        },
      },
    },
  ];

  if (hasSecondary.value) {
    const sec = cfg.secondary!;
    const secColor = sec.color || "#ffb74d";
    const secNegColor = sec.negativeColor || "#ef5350";

    const secMap = new Map(secondaryData.value.map((p) => [p.t, p.v]));
    const secValues = allTimestamps.map((ts) => secMap.get(ts) ?? null);

    datasets.push({
      label: sec.unit ? `Secondary (${sec.unit})` : "Secondary",
      data: secValues,
      borderColor: secColor,
      backgroundColor: hexToRgba(secColor, 0.1),
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      fill: false,
      tension: 0.3,
      spanGaps: true,
      yAxisID: "y1",
      segment: {
        borderColor: (ctx: any) => {
          const p0 = ctx.p0?.parsed?.y;
          const p1 = ctx.p1?.parsed?.y;
          if ((p0 != null && p0 < 0) || (p1 != null && p1 < 0)) {
            return secNegColor;
          }
          return undefined;
        },
      },
    });
  }

  return { labels, datasets };
});

function formatValue(value: number, decimals: number | undefined): string {
  if (decimals != null) return value.toFixed(decimals);
  return String(value);
}

const chartOptions = computed(() => {
  const cfg = props.widget.config;
  const primaryUnit = cfg.unit || "";
  const hasSec = hasSecondary.value;
  const secUnit = cfg.secondary?.unit || "";
  const dec = cfg.decimals;

  const scales: any = {
    x: {
      display: !cfg.hideXAxis,
      ticks: {
        color: "rgba(255,255,255,0.4)",
        maxTicksLimit: 8,
        font: { size: 10 },
      },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
    y: {
      display: true,
      position: "left" as const,
      ticks: {
        color: "rgba(255,255,255,0.4)",
        font: { size: 10 },
        callback: (value: number) => {
          const v = formatValue(value, dec);
          return primaryUnit ? `${v} ${primaryUnit}` : v;
        },
      },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
  };

  if (hasSec) {
    scales.y1 = {
      display: true,
      position: "right" as const,
      ticks: {
        color: "rgba(255,255,255,0.4)",
        font: { size: 10 },
        callback: (value: number) => {
          const v = formatValue(value, dec);
          return secUnit ? `${v} ${secUnit}` : v;
        },
      },
      grid: { drawOnChartArea: false },
    };
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: hasSec },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        callbacks: {
          label: (ctx: any) => {
            const dsIndex = ctx.datasetIndex;
            const unit = dsIndex === 0 ? primaryUnit : secUnit;
            const val = formatValue(ctx.parsed.y, dec);
            return unit ? `${val} ${unit}` : val;
          },
        },
      },
    },
    scales,
  };
});
</script>

<template>
  <div class="live-chart-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="chart-container">
      <div v-if="!hasData" class="chart-waiting">Waiting for data...</div>
      <Line v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.live-chart-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.live-chart-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chart-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
