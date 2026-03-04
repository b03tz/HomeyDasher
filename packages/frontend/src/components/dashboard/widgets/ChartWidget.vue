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
import type { ChartWidget as ChartWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const props = defineProps<{
  widget: ChartWidgetType;
}>();


interface InsightEntry {
  t: string;
  v: number | null;
}

const entries = ref<InsightEntry[]>([]);
const secondaryEntries = ref<InsightEntry[]>([]);
const loading = ref(true);
let intervalId: ReturnType<typeof setInterval> | null = null;

async function fetchLogEntries(logId: string, resolution: string): Promise<InsightEntry[]> {
  const url = `/api/insights/log/${encodeURIComponent(logId)}/entries?resolution=${resolution}`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data) ? data : (data.values ?? []);
  }
  console.warn("[ChartWidget] fetch failed:", res.status, await res.text());
  return [];
}

async function fetchEntries() {
  try {
    const { logId, resolution, secondary } = props.widget.config;
    if (!logId) return;

    const fetches: Promise<InsightEntry[]>[] = [fetchLogEntries(logId, resolution)];
    if (secondary?.logId) {
      fetches.push(fetchLogEntries(secondary.logId, resolution));
    }

    const results = await Promise.all(fetches);
    entries.value = results[0];
    secondaryEntries.value = results[1] ?? [];
  } catch (err) {
    console.error("[ChartWidget] fetch error:", err);
  } finally {
    loading.value = false;
  }
}

const hasSecondary = computed(() => !!props.widget.config.secondary?.logId);

const chartData = computed(() => {
  const cfg = props.widget.config;
  const primaryMultiplier = cfg.multiplier ?? 1;
  const primaryColor = cfg.color || "#4fc3f7";

  const filtered = entries.value.filter((e) => e.v !== null);
  const labels = filtered.map((e) => {
    const d = new Date(e.t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const datasets: any[] = [
    {
      label: cfg.unit ? `Primary (${cfg.unit})` : "Primary",
      data: filtered.map((e) => (e.v as number) * primaryMultiplier),
      borderColor: primaryColor,
      backgroundColor: hexToRgba(primaryColor, 0.1),
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      fill: !hasSecondary.value,
      tension: 0.3,
      yAxisID: "y",
    },
  ];

  if (hasSecondary.value) {
    const sec = cfg.secondary!;
    const secMultiplier = sec.multiplier ?? 1;
    const secColor = sec.color || "#ffb74d";
    const secFiltered = secondaryEntries.value.filter((e) => e.v !== null);

    // Use secondary's own timestamps for labels if primary is empty
    const secLabels = secFiltered.map((e) => {
      const d = new Date(e.t);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    });

    // Merge labels (use the longer set)
    const finalLabels = labels.length >= secLabels.length ? labels : secLabels;

    datasets.push({
      label: sec.unit ? `Secondary (${sec.unit})` : "Secondary",
      data: secFiltered.map((e) => (e.v as number) * secMultiplier),
      borderColor: secColor,
      backgroundColor: hexToRgba(secColor, 0.1),
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 8,
      fill: false,
      tension: 0.3,
      yAxisID: "y1",
    });

    return { labels: finalLabels, datasets };
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
            const val = ctx.parsed.y;
            return unit ? `${val} ${unit}` : String(val);
          },
        },
      },
    },
    scales,
  };
});

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

onMounted(() => {
  fetchEntries();
  intervalId = setInterval(fetchEntries, 60_000);
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
