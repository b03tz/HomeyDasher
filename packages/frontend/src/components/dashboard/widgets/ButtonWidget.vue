<script setup lang="ts">
import type { ButtonWidget } from "@homecontrol/shared";
import WidgetHeader from "../WidgetHeader.vue";
import ButtonItem from "./ButtonItem.vue";

defineProps<{
  widget: ButtonWidget;
}>();
</script>

<template>
  <div class="button-widget">
    <WidgetHeader :title="widget.title" :hidden="widget.hideTitle" />
    <div class="button-list">
      <ButtonItem
        v-for="ref in widget.config.flows"
        :key="ref.flowId"
        :flow-ref="ref"
      />
    </div>
  </div>
</template>

<style scoped>
.button-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.button-list {
  display: flex;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
</style>
