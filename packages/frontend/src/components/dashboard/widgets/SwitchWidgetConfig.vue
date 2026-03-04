<script setup lang="ts">
import { computed } from "vue";
import type { WidgetDeviceRef } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import DeviceSearchSelect from "../DeviceSearchSelect.vue";

const props = defineProps<{
  devices: WidgetDeviceRef[];
}>();

const emit = defineEmits<{
  "update:devices": [devices: WidgetDeviceRef[]];
}>();

const deviceStore = useDeviceStore();

const MAX_DEVICES = 8;

function addDevice(ref: WidgetDeviceRef) {
  if (props.devices.length >= MAX_DEVICES) return;
  // Auto-pick slider capability default
  const device = deviceStore.devices[ref.deviceId];
  let sliderCapabilityId: string | undefined;
  if (device) {
    const caps = Object.values(device.capabilities);
    const dim = caps.find(c => c.id === "dim" && c.type === "number" && c.setable);
    const targetTemp = caps.find(c => c.id === "target_temperature" && c.type === "number" && c.setable);
    const firstNum = caps.find(c => c.type === "number" && c.setable);
    if (dim) sliderCapabilityId = "dim";
    else if (targetTemp) sliderCapabilityId = "target_temperature";
    else if (firstNum) sliderCapabilityId = firstNum.id;
  }
  emit("update:devices", [...props.devices, { ...ref, sliderCapabilityId }]);
}

function removeDevice(index: number) {
  const updated = [...props.devices];
  updated.splice(index, 1);
  emit("update:devices", updated);
}

function updateSliderCapability(index: number, capId: string) {
  const updated = [...props.devices];
  updated[index] = { ...updated[index], sliderCapabilityId: capId || undefined };
  emit("update:devices", updated);
}

function deviceName(ref: WidgetDeviceRef) {
  return deviceStore.devices[ref.deviceId]?.name ?? "Unknown device";
}

function getSliderOptions(ref: WidgetDeviceRef) {
  const device = deviceStore.devices[ref.deviceId];
  if (!device) return [];
  return Object.values(device.capabilities).filter(
    c => c.type === "number" && c.setable
  );
}

const remaining = computed(() => MAX_DEVICES - props.devices.length);
</script>

<template>
  <div class="switch-config">
    <label class="config-label">
      Devices ({{ props.devices.length }}/{{ MAX_DEVICES }})
    </label>
    <DeviceSearchSelect
      :selected="props.devices"
      :max="MAX_DEVICES"
      @add="addDevice"
    />
    <div v-if="props.devices.length > 0" class="device-list">
      <div
        v-for="(ref, i) in props.devices"
        :key="ref.deviceId + ref.capabilityId"
        class="device-row"
      >
        <span class="chip">
          {{ deviceName(ref) }}
          <button class="chip-remove" @click="removeDevice(i)" aria-label="Remove device">&times;</button>
        </span>
        <select
          v-if="getSliderOptions(ref).length > 0"
          class="slider-select"
          :value="ref.sliderCapabilityId ?? ''"
          @change="updateSliderCapability(i, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">No slider</option>
          <option
            v-for="cap in getSliderOptions(ref)"
            :key="cap.id"
            :value="cap.id"
          >
            {{ cap.title }} ({{ cap.id }})
          </option>
        </select>
      </div>
    </div>
    <p v-if="remaining > 0 && props.devices.length > 0" class="hint">
      {{ remaining }} more device{{ remaining !== 1 ? 's' : '' }} allowed
    </p>
  </div>
</template>

<style scoped>
.switch-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.device-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.chip-remove {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
}

.chip-remove:hover {
  color: var(--danger);
}

.slider-select {
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.75rem;
  outline: none;
}

.slider-select:focus {
  border-color: var(--accent);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}
</style>
