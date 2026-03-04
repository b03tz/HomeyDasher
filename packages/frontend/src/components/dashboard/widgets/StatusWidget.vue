<script setup lang="ts">
import { computed } from "vue";
import type { StatusWidget as StatusWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: StatusWidgetType;
}>();

const deviceStore = useDeviceStore();

const reversed = computed(() => !!props.widget.config.reverseColors);
const isLed = computed(() => props.widget.config.displayMode === "led");

const items = computed(() =>
  props.widget.config.devices.map((d) => {
    const device = deviceStore.devices[d.deviceId];
    const cap = device?.capabilities[d.capabilityId];
    const on = !!cap?.value;
    return {
      key: d.deviceId + d.capabilityId,
      name: device?.name ?? "Unknown",
      active: reversed.value ? !on : on,
    };
  })
);

/** For LED mode: true if ANY device is active */
const ledActive = computed(() => items.value.some((i) => i.active));
</script>

<template>
  <div class="status-widget" :class="{ 'led-mode': isLed }">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />

    <!-- LED mode: single big shiny indicator -->
    <div v-if="isLed" class="led-container">
      <div class="led-bulb" :class="{ active: ledActive }">
        <div class="led-shine" />
      </div>
    </div>

    <!-- List mode (default) -->
    <div v-else class="status-list">
      <div v-for="item in items" :key="item.key" class="status-row">
        <span class="status-dot" :class="{ active: item.active }" />
        <span class="status-name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ── List mode ── */
.status-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  overflow-y: auto;
  min-height: 0;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4caf50;
  flex-shrink: 0;
}

.status-dot.active {
  background: #f44336;
}

.status-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── LED mode ── */
.led-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.led-bulb {
  --led-size: min(60%, 64px);
  position: relative;
  width: var(--led-size);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #6edc6e, #2e7d32 60%, #1b5e20);
  box-shadow:
    0 0 12px 4px rgba(76, 175, 80, 0.4),
    0 0 30px 8px rgba(76, 175, 80, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.25);
  transition: background 0.3s, box-shadow 0.3s;
}

.led-bulb.active {
  background: radial-gradient(circle at 35% 35%, #ff8a80, #e53935 60%, #b71c1c);
  box-shadow:
    0 0 14px 6px rgba(244, 67, 54, 0.5),
    0 0 40px 12px rgba(244, 67, 54, 0.2),
    inset 0 -3px 6px rgba(0, 0, 0, 0.25);
}

.led-shine {
  position: absolute;
  top: 12%;
  left: 22%;
  width: 35%;
  height: 28%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%);
  transform: rotate(-30deg);
  pointer-events: none;
}
</style>
