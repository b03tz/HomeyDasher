<script setup lang="ts">
import type { ClockStyle, ClockDisplay } from "@homecontrol/shared";

defineProps<{
  style: ClockStyle;
  display: ClockDisplay;
  showSeconds: boolean;
  use24Hour: boolean;
}>();

const emit = defineEmits<{
  "update:style": [v: ClockStyle];
  "update:display": [v: ClockDisplay];
  "update:showSeconds": [v: boolean];
  "update:use24Hour": [v: boolean];
}>();
</script>

<template>
  <div class="clock-config">
    <label class="config-label">Style</label>
    <div class="picker">
      <button class="pick-btn" :class="{ active: style === 'analog' }" @click="emit('update:style', 'analog')">Analog</button>
      <button class="pick-btn" :class="{ active: style === 'digital' }" @click="emit('update:style', 'digital')">Digital</button>
    </div>

    <label class="config-label">Display</label>
    <div class="picker">
      <button class="pick-btn" :class="{ active: display === 'time' }" @click="emit('update:display', 'time')">Time only</button>
      <button class="pick-btn" :class="{ active: display === 'date' }" @click="emit('update:display', 'date')">Date only</button>
      <button class="pick-btn" :class="{ active: display === 'both' }" @click="emit('update:display', 'both')">Time &amp; Date</button>
    </div>

    <label class="checkbox-row">
      <input type="checkbox" :checked="showSeconds" @change="emit('update:showSeconds', ($event.target as HTMLInputElement).checked)" />
      <span>Show seconds</span>
    </label>

    <label class="checkbox-row">
      <input type="checkbox" :checked="use24Hour" @change="emit('update:use24Hour', ($event.target as HTMLInputElement).checked)" />
      <span>24-hour format</span>
    </label>
  </div>
</template>

<style scoped>
.clock-config { display: flex; flex-direction: column; gap: 8px; }
.config-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.picker { display: flex; gap: 4px; }
.pick-btn {
  flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-secondary); color: var(--text-primary); font-size: 0.8rem; cursor: pointer;
}
.pick-btn.active { border-color: var(--accent); background: rgba(79, 195, 247, 0.1); color: var(--accent); }
.checkbox-row {
  display: flex; align-items: center; gap: 8px; font-size: 0.85rem;
  color: var(--text-primary); cursor: pointer;
}
.checkbox-row input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
</style>
