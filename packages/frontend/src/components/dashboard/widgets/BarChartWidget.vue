<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
} from "chart.js";
import type { BarChartWidget as BarChartWidgetType } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip);

const props = defineProps<{
  widget: BarChartWidgetType;
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
  console.warn("[BarChartWidget] fetch failed:", res.status, await res.text());
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
    console.error("[BarChartWidget] fetch error:", err);
  } finally {
    loading.value = false;
  }
}

const hasSecondary = computed(() => !!props.widget.config.secondary?.logId);

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
      backgroundColor: hexToRgba(primaryColor, 0.7),
      borderColor: primaryColor,
      borderWidth: 1,
      borderRadius: 3,
      yAxisID: "y",
    },
  ];

  if (hasSecondary.value) {
    const sec = cfg.secondary!;
    const secMultiplier = sec.multiplier ?? 1;
    const secColor = sec.color || "#ffb74d";
    const secFiltered = secondaryEntries.value.filter((e) => e.v !== null);

    const secLabels = secFiltered.map((e) => {
      const d = new Date(e.t);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    });

    const finalLabels = labels.length >= secLabels.length ? labels : secLabels;

    datasets.push({
      label: sec.unit ? `Secondary (${sec.unit})` : "Secondary",
      data: secFiltered.map((e) => (e.v as number) * secMultiplier),
      backgroundColor: hexToRgba(secColor, 0.7),
      borderColor: secColor,
      borderWidth: 1,
      borderRadius: 3,
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
            const val = formatValue(ctx.parsed.y, dec);
            return unit ? `${val} ${unit}` : val;
          },
        },
      },
    },
    scales,
  };
});

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
      <Bar v-else :data="chartData" :options="chartOptions" />
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
