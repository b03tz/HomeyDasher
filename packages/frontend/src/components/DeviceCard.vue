<script setup lang="ts">
import type { HomeyDevice } from "@homecontrol/shared";
import { useDeviceStore } from "../stores/devices";
import ToggleControl from "./controls/ToggleControl.vue";
import SliderControl from "./controls/SliderControl.vue";

const props = defineProps<{
  device: HomeyDevice;
}>();

const deviceStore = useDeviceStore();

async function handleChange(capabilityId: string, value: unknown) {
  try {
    await deviceStore.setCapabilityValue(props.device.id, capabilityId, value);
  } catch (err) {
    console.error("Failed to set capability:", err);
  }
}

const capabilityList = Object.values(props.device.capabilities).filter(
  (c) => c.setable || c.getable
);
</script>

<template>
  <div class="device-card" :class="{ unavailable: !device.available }">
    <div class="device-header">
      <span class="device-name">{{ device.name }}</span>
      <span class="device-class">{{ device.class }}</span>
    </div>
    <div class="device-controls">
      <template v-for="cap in capabilityList" :key="cap.id">
        <ToggleControl
          v-if="cap.type === 'boolean' && cap.setable"
          :capability="cap"
          :device-id="device.id"
          @change="handleChange"
        />
        <SliderControl
          v-else-if="cap.type === 'number' && cap.setable"
          :capability="cap"
          :device-id="device.id"
          @change="handleChange"
        />
        <div v-else-if="cap.getable" class="read-only">
          <span class="cap-label">{{ cap.title }}</span>
          <span class="cap-value">{{ cap.value }}{{ cap.units ?? "" }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.device-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-card.unavailable {
  opacity: 0.5;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-name {
  font-weight: 600;
  font-size: 1rem;
}

.device-class {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.device-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.read-only {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.cap-label {
  color: var(--text-secondary);
}

.cap-value {
  color: var(--text-primary);
}
</style>
