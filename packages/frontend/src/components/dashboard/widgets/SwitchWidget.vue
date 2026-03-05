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
  backdrop-filter: blur(var(--card-blur, 18px));
  -webkit-backdrop-filter: blur(var(--card-blur, 18px));
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.switch-widget:hover {
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: var(--card-shadow), 0 0 24px rgba(79, 195, 247, 0.12);
}

.switch-buttons {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
</style>
