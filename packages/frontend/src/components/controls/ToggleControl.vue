<script setup lang="ts">
import type { DeviceCapability } from "@homecontrol/shared";

const props = defineProps<{
  capability: DeviceCapability;
  deviceId: string;
}>();

const emit = defineEmits<{
  change: [capabilityId: string, value: boolean];
}>();

function toggle() {
  emit("change", props.capability.id, !props.capability.value);
}
</script>

<template>
  <button
    class="toggle"
    :class="{ active: capability.value }"
    :aria-label="capability.title"
    @click="toggle"
  >
    <span class="toggle-dot" />
  </button>
</template>

<style scoped>
.toggle {
  position: relative;
  width: 56px;
  height: 32px;
  border-radius: 16px;
  border: none;
  background: var(--border);
  cursor: pointer;
  transition: background 0.2s;
  min-height: var(--touch-min);
  min-width: var(--touch-min);
  display: flex;
  align-items: center;
  padding: 3px;
}

.toggle.active {
  background: var(--accent);
}

.toggle-dot {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}

.toggle.active .toggle-dot {
  transform: translateX(24px);
}
</style>
