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
const displayMode = computed(() => {
  const mode = props.widget.config.displayMode;
  if (mode === "columns") return "columns";
  return "led-list";
});

const items = computed(() =>
  props.widget.config.devices.map((d) => {
    const device = deviceStore.devices[d.deviceId];
    const cap = device?.capabilities[d.capabilityId];
    const on = !!cap?.value;
    return {
      key: d.deviceId + d.capabilityId,
      name: deviceStore.getDeviceName(d.deviceId),
      active: reversed.value ? !on : on,
    };
  })
);
</script>

<template>
  <div class="status-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />

    <!-- Columns mode: side-by-side with name on top, big LED below -->
    <div v-if="displayMode === 'columns'" class="columns-container">
      <div v-for="item in items" :key="item.key" class="column-item">
        <span class="column-name">{{ item.name }}</span>
        <div class="column-led" :class="{ active: item.active }">
          <div class="column-led-shine" />
        </div>
      </div>
    </div>

    <!-- LED list mode (default): vertical list with LED on left, name next to it -->
    <div v-else class="led-list">
      <div v-for="item in items" :key="item.key" class="led-list-row">
        <div class="led-list-bulb" :class="{ active: item.active }">
          <div class="led-list-shine" />
        </div>
        <span class="led-list-name">{{ item.name }}</span>
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
  overflow: visible;
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.status-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}


/* ── LED list mode ── */
.led-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  min-height: 0;
  padding: 4px 8px;
}

.led-list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
  overflow: visible;
}

.led-list-bulb {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #6edc6e, #2e7d32 60%, #1b5e20);
  box-shadow:
    0 0 6px 2px rgba(76, 175, 80, 0.35),
    0 0 14px 4px rgba(76, 175, 80, 0.12),
    inset 0 -1px 3px rgba(0, 0, 0, 0.25);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.led-list-bulb.active {
  background: radial-gradient(circle at 35% 35%, #ff8a80, #e53935 60%, #b71c1c);
  box-shadow:
    0 0 8px 3px rgba(244, 67, 54, 0.45),
    0 0 20px 6px rgba(244, 67, 54, 0.15),
    inset 0 -1px 3px rgba(0, 0, 0, 0.25);
}

.led-list-shine {
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

.led-list-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Columns mode ── */
.columns-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 0;
  padding: 4px 0;
}

.column-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.column-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 2px;
}

.column-led {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #6edc6e, #2e7d32 60%, #1b5e20);
  box-shadow:
    0 0 8px 3px rgba(76, 175, 80, 0.35),
    0 0 20px 6px rgba(76, 175, 80, 0.12),
    inset 0 -2px 4px rgba(0, 0, 0, 0.25);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.column-led.active {
  background: radial-gradient(circle at 35% 35%, #ff8a80, #e53935 60%, #b71c1c);
  box-shadow:
    0 0 10px 4px rgba(244, 67, 54, 0.45),
    0 0 28px 8px rgba(244, 67, 54, 0.15),
    inset 0 -2px 4px rgba(0, 0, 0, 0.25);
}

.column-led-shine {
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
