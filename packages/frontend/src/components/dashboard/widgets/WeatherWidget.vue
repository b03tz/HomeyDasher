<script setup lang="ts">
import { computed } from "vue";
import type { WeatherWidget as WeatherWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: WeatherWidgetType;
}>();

const deviceStore = useDeviceStore();
const device = computed(() => deviceStore.devices[props.widget.config.deviceId]);

interface WeatherRow {
  key: string;
  label: string;
  unit: string;
  icon: string; // SVG path data
  value: string | null;
}

const CAPABILITY_MAP: { id: string; label: string; unit: string; icon: string }[] = [
  {
    id: "measure_temperature",
    label: "Temperature",
    unit: "°C",
    icon: "M12 2a3 3 0 0 0-3 3v7.07A5 5 0 1 0 15 17a5 5 0 0 0-2-4.93V5a3 3 0 0 0-3-3z",
  },
  {
    id: "measure_humidity",
    label: "Humidity",
    unit: "%",
    icon: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z",
  },
  {
    id: "measure_pressure",
    label: "Pressure",
    unit: "mbar",
    icon: "M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83",
  },
  {
    id: "measure_wind_strength",
    label: "Wind",
    unit: "km/h",
    icon: "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2",
  },
  {
    id: "measure_rain",
    label: "Rain",
    unit: "mm",
    icon: "M16 13v8m-4-6v6m-4-4v4M7 4a4 4 0 0 1 8 0 3 3 0 0 1 3 3H4a3 3 0 0 1 3-3z",
  },
  {
    id: "measure_luminance",
    label: "Light",
    unit: "lux",
    icon: "M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
  },
];

const rows = computed<WeatherRow[]>(() => {
  if (!device.value) return [];
  return CAPABILITY_MAP
    .filter((c) => device.value!.capabilities[c.id] != null)
    .map((c) => {
      const cap = device.value!.capabilities[c.id];
      const v = cap?.value;
      let display: string | null = null;
      if (v != null) {
        const n = Number(v);
        if (!isNaN(n)) {
          display = Number.isInteger(n) ? n.toString() : n.toFixed(1);
        }
      }
      return {
        key: c.id,
        label: c.label,
        unit: cap?.units ?? c.unit,
        icon: c.icon,
        value: display,
      };
    });
});
</script>

<template>
  <div class="weather-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="weather-rows">
      <div v-for="row in rows" :key="row.key" class="weather-row">
        <svg class="weather-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="row.icon" />
        </svg>
        <span class="weather-value">{{ row.value ?? '—' }}</span>
        <span class="weather-unit">{{ row.unit }}</span>
      </div>
      <div v-if="rows.length === 0" class="empty">No weather data</div>
    </div>
  </div>
</template>

<style scoped>
.weather-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.weather-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
}

.weather-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.weather-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.weather-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.weather-unit {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
</style>
