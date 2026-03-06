<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { SliderWidget as SliderWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: SliderWidgetType;
}>();

const deviceStore = useDeviceStore();

const device = computed(() => deviceStore.devices[props.widget.config.deviceId]);
const capability = computed(() => device.value?.capabilities[props.widget.config.capabilityId]);

const size = computed(() => props.widget.config.size ?? "medium");
const orientation = computed(() => props.widget.config.orientation ?? "horizontal");

// Detect 0-1 range capabilities (e.g. dim) and scale to 0-100 for the UI.
// Check the capability's native min/max before config overrides kick in.
const isNormalized = computed(() => {
  const capMin = capability.value?.min;
  const capMax = capability.value?.max;
  return capMin === 0 && capMax === 1;
});
const scale = computed(() => isNormalized.value ? 100 : 1);

// Config overrides are assumed to be in display units (i.e. already scaled for 0-1 caps)
const min = computed(() => props.widget.config.min ?? (capability.value?.min ?? 0) * scale.value);
const max = computed(() => props.widget.config.max ?? (capability.value?.max ?? 100) * scale.value);
const step = computed(() => {
  if (props.widget.config.step != null) return props.widget.config.step;
  const capStep = capability.value?.step;
  if (capStep != null) return capStep * scale.value;
  return isNormalized.value ? 1 : 1;
});
const unit = computed(() => {
  if (props.widget.config.unit) return props.widget.config.unit;
  if (isNormalized.value) return "%";
  return capability.value?.units ?? "";
});

const liveValue = computed(() => {
  const v = capability.value?.value;
  return typeof v === "number" ? v * scale.value : min.value;
});

const localValue = ref(liveValue.value);
const isDragging = ref(false);

// Sync from live updates when not actively dragging
watch(liveValue, (v) => {
  if (!isDragging.value) localValue.value = v;
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function onInput(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  localValue.value = val;
  isDragging.value = true;

  // Convert back to the device's native range before sending
  const deviceVal = val / scale.value;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await deviceStore.setCapabilityValue(props.widget.config.deviceId, props.widget.config.capabilityId, deviceVal);
    } finally {
      isDragging.value = false;
    }
  }, 250);
}

const fillPct = computed(() => {
  const range = max.value - min.value;
  if (range <= 0) return "0%";
  const pct = ((localValue.value - min.value) / range) * 100;
  return `${Math.max(0, Math.min(100, pct))}%`;
});

const displayValue = computed(() => {
  const v = localValue.value;
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
});
</script>

<template>
  <div class="slider-widget" :class="[`size-${size}`, `orient-${orientation}`]">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="slider-body">
      <div v-if="!widget.config.hideValue" class="slider-display">
        <span class="slider-value">{{ displayValue }}</span>
        <span v-if="unit" class="slider-unit">{{ unit }}</span>
      </div>
      <input
        type="range"
        class="slider-range"
        :min="min"
        :max="max"
        :step="step"
        :value="localValue"
        :style="{ '--fill-pct': fillPct } as any"
        @input="onInput"
      />
    </div>
  </div>
</template>

<style scoped>
.slider-widget {
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

.slider-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.slider-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 0;
}

.slider-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.slider-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.slider-unit {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* --- Size: small --- */
.size-small .slider-value {
  font-size: 1rem;
}
.size-small .slider-unit {
  font-size: 0.7rem;
}
.size-small .slider-range {
  height: 4px;
}
.size-small .slider-range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
}
.size-small .slider-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
}

/* --- Size: medium --- */
.size-medium .slider-value {
  font-size: 1.8rem;
}
.size-medium .slider-unit {
  font-size: 1rem;
}
.size-medium .slider-range {
  height: 12px;
  border-radius: 6px;
}
.size-medium .slider-range::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
}
.size-medium .slider-range::-moz-range-thumb {
  width: 26px;
  height: 26px;
}
.size-medium .slider-range::-moz-range-track {
  height: 12px;
}

/* --- Size: large --- */
.size-large .slider-value {
  font-size: 2.6rem;
}
.size-large .slider-unit {
  font-size: 1.3rem;
}
.size-large .slider-body {
  gap: 14px;
}
.size-large .slider-range {
  height: 24px;
  border-radius: 12px;
}
.size-large .slider-range::-webkit-slider-thumb {
  width: 40px;
  height: 40px;
  border-width: 3px;
}
.size-large .slider-range::-moz-range-thumb {
  width: 40px;
  height: 40px;
  border-width: 3px;
}
.size-large .slider-range::-moz-range-track {
  height: 24px;
}

/* --- Horizontal (default) --- */
.slider-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right,
    var(--widget-slider-fill, var(--accent)) 0%,
    var(--widget-slider-fill, var(--accent)) var(--fill-pct, 0%),
    var(--border) var(--fill-pct, 0%),
    var(--border) 100%);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.slider-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid rgba(8, 12, 20, 0.8);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(79, 195, 247, 0.3);
}

.slider-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid rgba(8, 12, 20, 0.8);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(79, 195, 247, 0.3);
}

.slider-range::-moz-range-track {
  background: transparent;
  height: 6px;
}

/* --- Vertical orientation --- */
.orient-vertical .slider-body {
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.orient-vertical .slider-range {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 6px;
  height: 100%;
  min-height: 60px;
  flex: 1;
  background: linear-gradient(to top,
    var(--widget-slider-fill, var(--accent)) 0%,
    var(--widget-slider-fill, var(--accent)) var(--fill-pct, 0%),
    var(--border) var(--fill-pct, 0%),
    var(--border) 100%);
}

.orient-vertical.size-small .slider-range {
  width: 4px;
}

.orient-vertical.size-medium .slider-range {
  width: 12px;
}

.orient-vertical.size-large .slider-range {
  width: 24px;
}
</style>
