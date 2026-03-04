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
</script>

<template>
  <div class="status-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="status-list">
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
</style>
