<script setup lang="ts">
import { computed } from "vue";
import type { BatteryWidget as BatteryWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: BatteryWidgetType;
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
const fillColor = computed(() => props.widget.config.color ?? "var(--accent)");
const isHorizontal = computed(() => props.widget.config.orientation === "horizontal");
const isBars = computed(() => props.widget.config.style === "bars");
const size = computed(() => props.widget.config.size ?? "medium");

const BAR_COUNT = 10;

const activeBars = computed(() => {
  if (ratio.value <= 0) return 0;
  return Math.max(1, Math.round(ratio.value * BAR_COUNT));
});

// For bars mode in vertical: we render bar 10 first (top) down to bar 1 (bottom).
// Active bars fill from bottom, so bar i is active when i <= activeBars.
// With the reversed array, index 0 = bar 10 (top), index 9 = bar 1 (bottom).
const barsTopDown = computed(() => {
  const arr: { index: number; active: boolean }[] = [];
  for (let i = BAR_COUNT; i >= 1; i--) {
    arr.push({ index: i, active: i <= activeBars.value });
  }
  return arr;
});

// For horizontal: bar 1 (left) to bar 10 (right)
const barsLeftRight = computed(() => {
  const arr: { index: number; active: boolean }[] = [];
  for (let i = 1; i <= BAR_COUNT; i++) {
    arr.push({ index: i, active: i <= activeBars.value });
  }
  return arr;
});
</script>

<template>
  <div
    class="battery-widget"
    :class="[
      isHorizontal ? 'orient-h' : 'orient-v',
      `size-${size}`,
    ]"
  >
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="battery-body">
      <div class="battery-shell">
        <!-- Vertical: cap on top, case below -->
        <!-- Horizontal: case left, cap on right -->
        <div class="battery-cap" />
        <div class="battery-case">
          <!-- Bars mode -->
          <template v-if="isBars">
            <div class="bars-container">
              <div
                v-for="bar in (isHorizontal ? barsLeftRight : barsTopDown)"
                :key="bar.index"
                class="bar"
                :style="{ background: bar.active ? fillColor : undefined }"
              />
            </div>
          </template>
          <!-- Continuous mode -->
          <template v-else>
            <div class="continuous-container">
              <div
                class="fill"
                :style="{
                  [isHorizontal ? 'width' : 'height']: `${ratio * 100}%`,
                  background: fillColor,
                }"
              />
            </div>
          </template>
        </div>
      </div>
      <div class="battery-value">
        <span class="value-text">{{ displayValue }}</span>
        <span v-if="unit" class="value-unit">{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battery-widget {
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
  overflow: hidden;
}

.battery-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

/* ─── Size CSS vars ─── */
.battery-widget.size-small  { --bat-thickness: 30%; --bat-border: 2px; --bat-pad: 2px; --bat-gap: 1px; --bat-cap-w: 4px; --bat-cap-ratio: 30%; --bat-bar-radius: 1px; }
.battery-widget.size-medium { --bat-thickness: 50%; --bat-border: 3px; --bat-pad: 3px; --bat-gap: 2px; --bat-cap-w: 6px; --bat-cap-ratio: 40%; --bat-bar-radius: 2px; }
.battery-widget.size-large  { --bat-thickness: 70%; --bat-border: 4px; --bat-pad: 4px; --bat-gap: 3px; --bat-cap-w: 8px; --bat-cap-ratio: 50%; --bat-bar-radius: 3px; }

.battery-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* ─── Shell: contains cap + case ─── */
.battery-shell {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Vertical: cap on top, case below → column layout */
.orient-v .battery-shell {
  flex-direction: column;
  width: var(--bat-thickness);
  flex: 1;
  min-height: 0;
}

/* Horizontal: case left, cap right → row layout */
.orient-h .battery-shell {
  flex-direction: row;
  height: var(--bat-thickness);
  flex: 1;
  min-width: 0;
  width: 100%;
}

/* ─── Cap (the nub) ─── */
.battery-cap {
  background: var(--border);
  flex-shrink: 0;
}

/* Vertical cap: centered on top */
.orient-v .battery-cap {
  width: var(--bat-cap-ratio);
  height: var(--bat-cap-w);
  border-radius: var(--bat-bar-radius) var(--bat-bar-radius) 0 0;
}

/* Horizontal cap: centered on right */
.orient-h .battery-cap {
  height: var(--bat-cap-ratio);
  width: var(--bat-cap-w);
  border-radius: 0 var(--bat-bar-radius) var(--bat-bar-radius) 0;
  order: 1;
}

/* ─── Case ─── */
.battery-case {
  border: var(--bat-border) solid var(--border);
  border-radius: calc(var(--bat-bar-radius) + 2px);
  padding: var(--bat-pad);
  overflow: hidden;
  display: flex;
}

.orient-v .battery-case {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.orient-h .battery-case {
  height: 100%;
  flex: 1;
  min-width: 0;
}

/* ─── Bars ─── */
.bars-container {
  display: flex;
  gap: var(--bat-gap);
  width: 100%;
  height: 100%;
}

/* Vertical bars: top to bottom (bar 10 at top, bar 1 at bottom) */
.orient-v .bars-container {
  flex-direction: column;
}

/* Horizontal bars: left to right */
.orient-h .bars-container {
  flex-direction: row;
}

.bar {
  flex: 1;
  border-radius: var(--bat-bar-radius);
  background: var(--bg-secondary);
  transition: background 0.3s;
  min-width: 0;
  min-height: 0;
}

/* ─── Continuous ─── */
.continuous-container {
  width: 100%;
  height: 100%;
  border-radius: var(--bat-bar-radius);
  overflow: hidden;
  background: var(--bg-secondary);
}

/* Vertical continuous: fill from bottom */
.orient-v .continuous-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* Horizontal continuous: fill from left */
.orient-h .continuous-container {
  display: flex;
  align-items: stretch;
}

.fill {
  border-radius: var(--bat-bar-radius);
  transition: width 0.5s ease, height 0.5s ease;
}

/* ─── Value display ─── */
.battery-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
}

.value-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.value-unit {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
