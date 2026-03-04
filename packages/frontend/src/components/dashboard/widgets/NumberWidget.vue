<script setup lang="ts">
import { computed } from "vue";
import type { NumberWidget as NumberWidgetType } from "@homecontrol/shared";
import { useDeviceStore } from "../../../stores/devices";
import WidgetHeader from "../WidgetHeader.vue";

const props = defineProps<{
  widget: NumberWidgetType;
}>();

const deviceStore = useDeviceStore();

const displayValue = computed(() => {
  const { deviceId, capabilityId, multiplier } = props.widget.config;
  const device = deviceStore.devices[deviceId];
  if (!device) return "—";
  const cap = device.capabilities[capabilityId];
  if (!cap || cap.value == null) return "—";

  const raw = Number(cap.value);
  if (isNaN(raw)) return "—";

  const result = raw * multiplier;

  // Use explicit decimals if configured
  const dec = props.widget.config.decimals;
  if (dec != null) return result.toFixed(dec);

  // Auto-format: avoid excessive decimals
  if (Number.isInteger(result)) return result.toString();
  return result.toFixed(result < 10 ? 2 : 1);
});
</script>

<template>
  <div :class="['number-widget', `size-${widget.config.size}`]">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="number-display">
      <span class="number-value">{{ displayValue }}</span>
      <span v-if="widget.config.unit" class="number-unit">{{ widget.config.unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.number-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.number-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 0;
}

.number-value {
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.number-unit {
  color: var(--text-secondary);
  font-weight: 500;
}

/* Size variants */
.size-small .number-value {
  font-size: 1.4rem;
}
.size-small .number-unit {
  font-size: 0.8rem;
}

.size-medium .number-value {
  font-size: 2rem;
}
.size-medium .number-unit {
  font-size: 1rem;
}

.size-large .number-value {
  font-size: 2.8rem;
}
.size-large .number-unit {
  font-size: 1.3rem;
}
</style>
