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

const min = computed(() => props.widget.config.min ?? capability.value?.min ?? 0);
const max = computed(() => props.widget.config.max ?? capability.value?.max ?? 100);
const step = computed(() => props.widget.config.step ?? capability.value?.step ?? 1);
const unit = computed(() => props.widget.config.unit ?? capability.value?.units ?? "");

const liveValue = computed(() => {
  const v = capability.value?.value;
  return typeof v === "number" ? v : min.value;
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

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await deviceStore.setCapabilityValue(props.widget.config.deviceId, props.widget.config.capabilityId, val);
    } finally {
      isDragging.value = false;
    }
  }, 250);
}

const displayValue = computed(() => {
  const v = localValue.value;
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
});
</script>

<template>
  <div class="slider-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="slider-body">
      <div class="slider-display">
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

.slider-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
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
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.slider-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>
