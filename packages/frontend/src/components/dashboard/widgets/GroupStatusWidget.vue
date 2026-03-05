<script setup lang="ts">
import { computed } from "vue";
import type { GroupStatusWidget as GroupStatusWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: GroupStatusWidgetType;
}>();

const deviceStore = useDeviceStore();

const values = computed(() =>
  props.widget.config.devices.map((d) => {
    const device = deviceStore.devices[d.deviceId];
    const cap = device?.capabilities[d.capabilityId];
    return cap?.value;
  })
);

const total = computed(() => props.widget.config.devices.length);

const onCount = computed(() =>
  values.value.filter((v) => !!v).length
);

const allOff = computed(() => onCount.value === 0);

const sum = computed(() => {
  const mult = props.widget.config.multiplier ?? 1;
  return values.value.reduce((acc: number, v) => {
    const n = Number(v);
    return acc + (isNaN(n) ? 0 : n * mult);
  }, 0);
});

const displaySum = computed(() => {
  const s = sum.value;
  if (Number.isInteger(s)) return s.toString();
  return s.toFixed(s < 10 ? 2 : 1);
});

const unit = computed(() => props.widget.config.unit ?? "");
</script>

<template>
  <div class="group-status-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="group-body">
      <!-- Count mode -->
      <template v-if="widget.config.mode === 'count'">
        <span class="big-text">{{ onCount }} / {{ total }}</span>
        <span class="sub-text">devices on</span>
      </template>

      <!-- All off mode -->
      <template v-else-if="widget.config.mode === 'allOff'">
        <svg v-if="allOff" class="status-icon ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <svg v-else class="status-icon bad" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span class="sub-text">{{ allOff ? 'All off' : `${onCount} of ${total} on` }}</span>
      </template>

      <!-- Sum mode -->
      <template v-else>
        <div class="sum-display">
          <span class="big-text">{{ displaySum }}</span>
          <span v-if="unit" class="sum-unit">{{ unit }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.group-status-widget {
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

.group-status-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.group-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 0;
}

.big-text {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.sub-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-icon {
  width: 48px;
  height: 48px;
}

.status-icon.ok {
  color: #4caf50;
}

.status-icon.bad {
  color: #f44336;
}

.sum-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.sum-unit {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>
