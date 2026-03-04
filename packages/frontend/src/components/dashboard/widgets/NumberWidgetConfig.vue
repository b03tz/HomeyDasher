<script setup lang="ts">
import { ref, watch } from "vue";
import type { NumberWidgetSize } from "@homecontrol/shared";
import DeviceCapabilitySelect from "../DeviceCapabilitySelect.vue";

const props = defineProps<{
  deviceId: string;
  capabilityId: string;
  unit: string;
  multiplier: number;
  size: NumberWidgetSize;
  decimals: number | undefined;
}>();

const emit = defineEmits<{
  "update:deviceId": [value: string];
  "update:capabilityId": [value: string];
  "update:unit": [value: string];
  "update:multiplier": [value: number];
  "update:size": [value: NumberWidgetSize];
  "update:decimals": [value: number | undefined];
}>();

const SIZES: { value: NumberWidgetSize; label: string }[] = [
  { value: "small", label: "Small (1 col)" },
  { value: "medium", label: "Medium (2 cols)" },
  { value: "large", label: "Large (3 cols)" },
];

const selected = ref<{ deviceId: string; capabilityId: string } | null>(
  props.deviceId && props.capabilityId
    ? { deviceId: props.deviceId, capabilityId: props.capabilityId }
    : null
);

watch(selected, (val) => {
  emit("update:deviceId", val?.deviceId ?? "");
  emit("update:capabilityId", val?.capabilityId ?? "");
});
</script>

<template>
  <div class="number-config">
    <label class="config-label">Device & Capability</label>
    <DeviceCapabilitySelect
      capability-filter="number"
      :selected="selected"
      @update:selected="selected = $event"
    />

    <label class="config-label">Display Unit</label>
    <input
      type="text"
      class="text-input"
      placeholder="e.g. kW, V, °C"
      :value="unit"
      @input="emit('update:unit', ($event.target as HTMLInputElement).value)"
    />

    <label class="config-label">Multiplier</label>
    <input
      type="number"
      class="text-input"
      step="any"
      :value="multiplier"
      @input="emit('update:multiplier', Number(($event.target as HTMLInputElement).value) || 1)"
    />

    <label class="config-label">Size</label>
    <div class="size-picker">
      <button
        v-for="s in SIZES"
        :key="s.value"
        :class="['size-btn', { active: size === s.value }]"
        @click="emit('update:size', s.value)"
      >
        {{ s.label }}
      </button>
    </div>

    <label class="config-label">Decimals</label>
    <div class="decimals-picker">
      <button
        :class="['dec-btn', { active: decimals == null }]"
        @click="emit('update:decimals', undefined)"
      >Auto</button>
      <button
        :class="['dec-btn', { active: decimals === 0 }]"
        @click="emit('update:decimals', 0)"
      >0</button>
      <button
        :class="['dec-btn', { active: decimals === 1 }]"
        @click="emit('update:decimals', 1)"
      >1</button>
      <button
        :class="['dec-btn', { active: decimals === 2 }]"
        @click="emit('update:decimals', 2)"
      >2</button>
    </div>
  </div>
</template>

<style scoped>
.number-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus {
  border-color: var(--accent);
}

.size-picker {
  display: flex;
  gap: 6px;
}

.size-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.size-btn:hover {
  border-color: var(--accent);
}

.size-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #000;
}

.decimals-picker {
  display: flex;
  gap: 6px;
}

.dec-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dec-btn:hover {
  border-color: var(--accent);
}

.dec-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #000;
}
</style>
