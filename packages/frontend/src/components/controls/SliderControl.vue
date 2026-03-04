<script setup lang="ts">
import { ref, watch } from "vue";
import type { DeviceCapability } from "@homecontrol/shared";

const props = defineProps<{
  capability: DeviceCapability;
  deviceId: string;
}>();

const emit = defineEmits<{
  change: [capabilityId: string, value: number];
}>();

const localValue = ref(Number(props.capability.value ?? 0));

watch(
  () => props.capability.value,
  (val) => {
    localValue.value = Number(val ?? 0);
  }
);

function onCommit() {
  emit("change", props.capability.id, localValue.value);
}
</script>

<template>
  <div class="slider-control">
    <label class="slider-label">
      {{ capability.title }}
      <span class="slider-value">{{ localValue }}{{ capability.units ?? "" }}</span>
    </label>
    <input
      type="range"
      class="slider"
      v-model.number="localValue"
      :min="capability.min ?? 0"
      :max="capability.max ?? 1"
      :step="capability.step ?? 0.01"
      @change="onCommit"
    />
  </div>
</template>

<style scoped>
.slider-control {
  width: 100%;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.slider-value {
  color: var(--text-primary);
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: var(--border);
  outline: none;
  cursor: pointer;
  min-height: var(--touch-min);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}
</style>
