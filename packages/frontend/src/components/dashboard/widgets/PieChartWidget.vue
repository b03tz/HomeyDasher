<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { Pie, Doughnut } from "vue-chartjs";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { PieChartWidget as PieChartWidgetType, PieChartSlice } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";
import { useDeviceStore } from "../../../stores/devices";

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  widget: PieChartWidgetType;
}>();

const deviceStore = useDeviceStore();

const DEFAULT_COLORS = [
  "#4fc3f7", "#ffb74d", "#81c784", "#e57373",
  "#ba68c8", "#4dd0e1", "#fff176", "#ff8a65",
];

interface InsightEntry {
  t: string;
  v: number | null;
}

// Aggregated values for insights slices, keyed by slice index
const insightsValues = ref<Record<number, number>>({});
let intervalId: ReturnType<typeof setInterval> | null = null;

function getSliceSource(slice: PieChartSlice): string {
  return (slice as any).source ?? "device";
}

async function fetchLogEntries(logId: string, resolution: string): Promise<InsightEntry[]> {
  const url = `/api/insights/log/${encodeURIComponent(logId)}/entries?resolution=${resolution}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.values ?? []);
  }
  console.warn("[PieChartWidget] fetch failed:", res.status, await res.text());
  return [];
}

function aggregate(entries: InsightEntry[], method: "sum" | "average"): number {
  const valid = entries.filter((e) => e.v !== null).map((e) => e.v as number);
  if (valid.length === 0) return 0;
  const total = valid.reduce((acc, v) => acc + v, 0);
  return method === "average" ? total / valid.length : total;
}

async function fetchInsightsData() {
  const cfg = props.widget.config;
  const resolution = cfg.resolution ?? "last24Hours";
  const aggregation = cfg.aggregation ?? "sum";
  const values: Record<number, number> = {};

  const fetches: { index: number; promise: Promise<InsightEntry[]> }[] = [];
  for (let i = 0; i < cfg.slices.length; i++) {
    const slice = cfg.slices[i];
    if (getSliceSource(slice) === "insights" && "logId" in slice) {
      fetches.push({ index: i, promise: fetchLogEntries(slice.logId, resolution) });
    }
  }

  const results = await Promise.all(fetches.map((f) => f.promise));
  for (let j = 0; j < fetches.length; j++) {
    values[fetches[j].index] = aggregate(results[j], aggregation);
  }

  insightsValues.value = values;
}

const hasInsightsSlices = computed(() =>
  props.widget.config.slices.some((s) => getSliceSource(s) === "insights")
);

function formatValue(value: number, decimals: number | undefined): string {
  if (decimals != null) return value.toFixed(decimals);
  return String(value);
}

const chartData = computed(() => {
  const cfg = props.widget.config;
  const multiplier = cfg.multiplier ?? 1;

  const labels: string[] = [];
  const data: number[] = [];
  const bgColors: string[] = [];

  for (let i = 0; i < cfg.slices.length; i++) {
    const slice = cfg.slices[i];
    const source = getSliceSource(slice);

    let numValue = 0;
    let label = "";

    if (source === "insights" && "logId" in slice) {
      numValue = (insightsValues.value[i] ?? 0) * multiplier;
      label = slice.label || slice.logId;
    } else {
      // Device slice (including backwards-compat slices without source)
      const deviceSlice = slice as any;
      const device = deviceStore.devices[deviceSlice.deviceId];
      const cap = device?.capabilities?.[deviceSlice.capabilityId];
      const rawValue = cap?.value;
      numValue = typeof rawValue === "number" ? rawValue * multiplier : 0;
      label = slice.label
        || `${deviceStore.getDeviceName(deviceSlice.deviceId)} - ${deviceSlice.capabilityId}`;
    }

    labels.push(label);
    data.push(numValue);
    bgColors.push(slice.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);
  }

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: bgColors,
        borderColor: "rgba(0,0,0,0.3)",
        borderWidth: 1,
      },
    ],
  };
});

const chartOptions = computed(() => {
  const cfg = props.widget.config;
  const unit = cfg.unit || "";
  const dec = cfg.decimals;

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: true,
        position: "right" as const,
        labels: {
          color: "rgba(255,255,255,0.7)",
          font: { size: 11 },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue(ctx.parsed, dec);
            return unit ? `${ctx.label}: ${val} ${unit}` : `${ctx.label}: ${val}`;
          },
        },
      },
    },
  };
});

const isPie = computed(() => props.widget.config.style !== "doughnut");

onMounted(() => {
  if (hasInsightsSlices.value) {
    fetchInsightsData();
    intervalId = setInterval(fetchInsightsData, 60_000);
  }
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="chart-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="chart-container">
      <Pie v-if="isPie" :data="chartData" :options="chartOptions" />
      <Doughnut v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.chart-widget {
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

.chart-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.chart-container {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
