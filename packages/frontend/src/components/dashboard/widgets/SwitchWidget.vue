<script setup lang="ts">
import type { SwitchWidget } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";
import SwitchItem from "./SwitchItem.vue";

defineProps<{
  widget: SwitchWidget;
}>();
</script>

<template>
  <div class="switch-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="switch-buttons">
      <SwitchItem
        v-for="ref in widget.config.devices"
        :key="ref.deviceId + ref.capabilityId"
        :device-ref="ref"
      />
    </div>
  </div>
</template>

<style scoped>
.switch-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.switch-buttons {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
</style>
