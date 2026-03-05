<script setup lang="ts">
import type { MultiLineChartSeries } from "@homecontrol/shared";
import InsightLogSelect from "../InsightLogSelect.vue";

const DEFAULT_COLORS = [
  "#4fc3f7", "#ffb74d", "#81c784", "#e57373",
  "#ba68c8", "#4dd0e1",
];

const props = defineProps<{
  series: MultiLineChartSeries[];
  resolution: string;
  hideXAxis: boolean;
  decimals: number | undefined;
}>();

const emit = defineEmits<{
  "update:series": [value: MultiLineChartSeries[]];
  "update:resolution": [value: string];
  "update:hideXAxis": [value: boolean];
  "update:decimals": [value: number | undefined];
}>();

const RESOLUTIONS = [
  { value: "lastHour", label: "Last hour" },
  { value: "last6Hours", label: "Last 6 hours" },
  { value: "last24Hours", label: "Last 24 hours" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "last14Days", label: "Last 14 days" },
  { value: "last31Days", label: "Last 31 days" },
];

function addSeries() {
  if (props.series.length >= 6) return;
  emit("update:series", [
    ...props.series,
    { logId: "", color: DEFAULT_COLORS[props.series.length % DEFAULT_COLORS.length] },
  ]);
}

function removeSeries(index: number) {
  const updated = [...props.series];
  updated.splice(index, 1);
  emit("update:series", updated);
}

function updateSeriesLogId(index: number, logId: string) {
  const updated = [...props.series];
  updated[index] = { ...updated[index], logId };
  emit("update:series", updated);
}

function updateSeriesColor(index: number, color: string) {
  const updated = [...props.series];
  updated[index] = { ...updated[index], color };
  emit("update:series", updated);
}

function updateSeriesUnit(index: number, unit: string) {
  const updated = [...props.series];
  updated[index] = { ...updated[index], unit: unit || undefined };
  emit("update:series", updated);
}

function updateSeriesMultiplier(index: number, multiplier: number) {
  const updated = [...props.series];
  updated[index] = { ...updated[index], multiplier: multiplier !== 1 ? multiplier : undefined };
  emit("update:series", updated);
}
</script>

<template>
  <div class="multi-line-config">
    <label class="config-label">Series ({{ series.length }}/6)</label>

    <div v-for="(s, i) in series" :key="i" class="series-row">
      <div class="series-header">
        <span class="series-num">#{{ i + 1 }}</span>
        <button class="btn-remove" @click="removeSeries(i)">&times;</button>
      </div>

      <label class="config-label">Insight Log</label>
      <InsightLogSelect
        :selected="s.logId || null"
        @update:selected="updateSeriesLogId(i, $event)"
      />

      <div class="inline-row">
        <div class="inline-field">
          <label class="config-label">Color</label>
          <input
            type="color"
            class="color-input"
            :value="s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]"
            @input="updateSeriesColor(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="inline-field flex-1">
          <label class="config-label">Unit</label>
          <input
            type="text"
            class="text-input"
            placeholder="e.g. W, kWh"
            :value="s.unit || ''"
            @input="updateSeriesUnit(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="inline-field flex-1">
          <label class="config-label">Multiplier</label>
          <input
            type="number"
            class="text-input"
            step="any"
            :value="s.multiplier ?? 1"
            @input="updateSeriesMultiplier(i, Number(($event.target as HTMLInputElement).value) || 1)"
          />
        </div>
      </div>
    </div>

    <button v-if="series.length < 6" class="btn-add" @click="addSeries">
      + Add series
    </button>

    <label class="config-label">Resolution</label>
    <select
      class="select-input"
      :value="resolution"
      @change="emit('update:resolution', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="r in RESOLUTIONS" :key="r.value" :value="r.value">
        {{ r.label }}
      </option>
    </select>

    <label class="checkbox-row">
      <input
        type="checkbox"
        class="checkbox-input"
        :checked="hideXAxis"
        @change="emit('update:hideXAxis', ($event.target as HTMLInputElement).checked)"
      />
      <span class="checkbox-label">Hide X axis</span>
    </label>

    <label class="config-label">Decimals</label>
    <div class="decimals-picker">
      <button
        :class="['dec-btn', { active: decimals == null }]"
        @click="emit('update:decimals', undefined)"
      >Auto</button>
      <button
        :class="['dec-btn', { active: decimals === 0 }]"
        @click="emit('update:decimals', 0)"
      >0</button>
      <button
        :class="['dec-btn', { active: decimals === 1 }]"
        @click="emit('update:decimals', 1)"
      >1</button>
      <button
        :class="['dec-btn', { active: decimals === 2 }]"
        @click="emit('update:decimals', 2)"
      >2</button>
    </div>
  </div>
</template>

<style scoped>
.multi-line-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.series-row {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.series-num {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.btn-remove {
  background: none;
  border: none;
  color: var(--danger, #ef5350);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.btn-remove:hover {
  opacity: 0.7;
}

.btn-add {
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-add:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.select-input,
.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.select-input:focus,
.text-input:focus {
  border-color: var(--accent);
}

.inline-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.inline-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flex-1 {
  flex: 1;
}

.color-input {
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  padding: 2px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.decimals-picker {
  display: flex;
  gap: 6px;
}

.dec-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dec-btn:hover {
  border-color: var(--accent);
}

.dec-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #000;
}
</style>
