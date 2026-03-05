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
  Legend,
  Filler,
} from "chart.js";
import type { MultiLineChartWidget as MultiLineChartWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const props = defineProps<{
  widget: MultiLineChartWidgetType;
}>();

interface InsightEntry {
  t: string;
  v: number | null;
}

const seriesData = ref<InsightEntry[][]>([]);
const loading = ref(true);
let intervalId: ReturnType<typeof setInterval> | null = null;

const DEFAULT_COLORS = [
  "#4fc3f7", "#ffb74d", "#81c784", "#e57373",
  "#ba68c8", "#4dd0e1",
];

async function fetchLogEntries(logId: string, resolution: string): Promise<InsightEntry[]> {
  const url = `/api/insights/log/${encodeURIComponent(logId)}/entries?resolution=${resolution}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.values ?? []);
  }
  console.warn("[MultiLineChartWidget] fetch failed:", res.status, await res.text());
  return [];
}

async function fetchAllSeries() {
  try {
    const { series, resolution } = props.widget.config;
    if (!series.length) return;

    const results = await Promise.all(
      series.map((s) => fetchLogEntries(s.logId, resolution))
    );
    seriesData.value = results;
  } catch (err) {
    console.error("[MultiLineChartWidget] fetch error:", err);
  } finally {
    loading.value = false;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const chartData = computed(() => {
  const cfg = props.widget.config;

  // Merge all timestamps and sort
  const allTimestamps = new Set<string>();
  for (const entries of seriesData.value) {
    for (const e of entries) {
      if (e.v !== null) allTimestamps.add(e.t);
    }
  }
  const sortedTimestamps = [...allTimestamps].sort();

  const labels = sortedTimestamps.map((t) => {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const datasets = cfg.series.map((s, i) => {
    const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const multiplier = s.multiplier ?? 1;
    const entries = seriesData.value[i] ?? [];

    // Build a map for fast lookup
    const valueMap = new Map<string, number>();
    for (const e of entries) {
      if (e.v !== null) valueMap.set(e.t, e.v * multiplier);
    }

    const data = sortedTimestamps.map((t) => valueMap.get(t) ?? null);
    const unitLabel = s.unit ? ` (${s.unit})` : "";

    return {
      label: `Series ${i + 1}${unitLabel}`,
      data,
      borderColor: color,
      backgroundColor: hexToRgba(color, 0.1),
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      fill: false,
      tension: 0.3,
      spanGaps: true,
    };
  });

  return { labels, datasets };
});

function formatValue(value: number, decimals: number | undefined): string {
  if (decimals != null) return value.toFixed(decimals);
  return String(value);
}

const chartOptions = computed(() => {
  const cfg = props.widget.config;
  const dec = cfg.decimals;

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: true,
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
            const s = cfg.series[ctx.datasetIndex];
            const unit = s?.unit || "";
            const val = formatValue(ctx.parsed.y, dec);
            return unit ? `${ctx.dataset.label}: ${val} ${unit}` : `${ctx.dataset.label}: ${val}`;
          },
        },
      },
    },
    scales: {
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
        ticks: {
          color: "rgba(255,255,255,0.4)",
          font: { size: 10 },
          callback: (value: string | number) => formatValue(Number(value), dec),
        },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };
});

onMounted(() => {
  fetchAllSeries();
  intervalId = setInterval(fetchAllSeries, 60_000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="chart-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="chart-container">
      <div v-if="loading" class="chart-loading">Loading...</div>
      <Line v-else :data="chartData" :options="chartOptions" />
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

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
