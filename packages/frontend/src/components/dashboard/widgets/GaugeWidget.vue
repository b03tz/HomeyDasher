<script setup lang="ts">
import { computed } from "vue";
import type { GaugeWidget as GaugeWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: GaugeWidgetType;
}>();

const deviceStore = useDeviceStore();

const rawValue = computed(() => {
  const { deviceId, capabilityId, multiplier } = props.widget.config;
  const device = deviceStore.devices[deviceId];
  const cap = device?.capabilities[capabilityId];
  if (!cap || cap.value == null) return null;
  const v = Number(cap.value);
  if (isNaN(v)) return null;
  return v * (multiplier ?? 1);
});

const capMeta = computed(() => {
  const { deviceId, capabilityId } = props.widget.config;
  const device = deviceStore.devices[deviceId];
  return device?.capabilities[capabilityId];
});

const min = computed(() => props.widget.config.min ?? capMeta.value?.min ?? 0);
const max = computed(() => props.widget.config.max ?? capMeta.value?.max ?? 100);

const ratio = computed(() => {
  if (rawValue.value == null) return 0;
  const range = max.value - min.value;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (rawValue.value - min.value) / range));
});

const displayValue = computed(() => {
  if (rawValue.value == null) return "—";
  const v = rawValue.value;

  const dec = props.widget.config.decimals;
  if (dec != null) return v.toFixed(dec);

  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(v < 10 ? 2 : 1);
});

const unit = computed(() => props.widget.config.unit ?? capMeta.value?.units ?? "");

// SVG arc params: semicircle from 180° to 0° (left to right, bottom)
const R = 40;
const CX = 50;
const CY = 50;
const STROKE = 8;

function arcPath(startAngle: number, endAngle: number): string {
  const s = (startAngle * Math.PI) / 180;
  const e = (endAngle * Math.PI) / 180;
  const x1 = CX + R * Math.cos(s);
  const y1 = CY - R * Math.sin(s);
  const x2 = CX + R * Math.cos(e);
  const y2 = CY - R * Math.sin(e);
  const span = Math.abs(endAngle - startAngle);
  const large = span > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

const bgArc = computed(() => arcPath(180, 0));

const valueArc = computed(() => {
  const angle = 180 - ratio.value * 180;
  if (ratio.value <= 0) return "";
  return arcPath(180, angle);
});

const arcColor = computed(() => {
  const t = props.widget.config.thresholds;
  if (!t || rawValue.value == null) return "var(--accent)";
  if (t.danger != null && rawValue.value >= t.danger) return "#f44336";
  if (t.warning != null && rawValue.value >= t.warning) return "#ff9800";
  return "#4caf50";
});
</script>

<template>
  <div class="gauge-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="gauge-body">
      <svg viewBox="0 0 100 60" class="gauge-svg">
        <path
          :d="bgArc"
          fill="none"
          stroke="var(--border)"
          :stroke-width="STROKE"
          stroke-linecap="round"
        />
        <path
          v-if="valueArc"
          :d="valueArc"
          fill="none"
          :stroke="arcColor"
          :stroke-width="STROKE"
          stroke-linecap="round"
        />
      </svg>
      <div class="gauge-value">
        <span class="value-text">{{ displayValue }}</span>
        <span v-if="unit" class="value-unit">{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gauge-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.gauge-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;
}

.gauge-svg {
  width: 100%;
  max-width: 200px;
}

.gauge-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: -8px;
}

.value-text {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.value-unit {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
