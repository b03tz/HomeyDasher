<script setup lang="ts">
import FlowSelect from "../FlowSelect.vue";

defineProps<{
  flowId: string;
  color: string;
}>();

const emit = defineEmits<{
  "update:flowId": [v: string];
  "update:color": [v: string];
}>();
</script>

<template>
  <div class="button-config">
    <FlowSelect
      :flow-id="flowId"
      @update:flow-id="emit('update:flowId', $event)"
    />

    <div class="field">
      <label class="config-label">Button color</label>
      <div class="color-row">
        <input
          type="color"
          class="color-picker"
          :value="color || '#4fc3f7'"
          @input="emit('update:color', ($event.target as HTMLInputElement).value)"
        />
        <span class="color-value">{{ color || '#4fc3f7' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.button-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.field { display: flex; flex-direction: column; gap: 4px; }
.color-row { display: flex; align-items: center; gap: 8px; }
.color-picker {
  width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 8px;
  background: none; cursor: pointer; padding: 2px;
}
.color-value { font-size: 0.8rem; color: var(--text-secondary); font-family: monospace; }
</style>
