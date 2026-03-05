<script setup lang="ts">
import { computed } from "vue";
import type { PieChartSlice, PieChartStyle, PieChartAggregation } from "@homecontrol/shared";
import DeviceCapabilitySelect from "../DeviceCapabilitySelect.vue";
import InsightLogSelect from "../InsightLogSelect.vue";

const DEFAULT_COLORS = [
  "#4fc3f7", "#ffb74d", "#81c784", "#e57373",
  "#ba68c8", "#4dd0e1", "#fff176", "#ff8a65",
];

const props = defineProps<{
  slices: PieChartSlice[];
  style: PieChartStyle;
  unit: string;
  multiplier: number;
  decimals: number | undefined;
  resolution: string | undefined;
  aggregation: PieChartAggregation | undefined;
}>();

const emit = defineEmits<{
  "update:slices": [value: PieChartSlice[]];
  "update:style": [value: PieChartStyle];
  "update:unit": [value: string];
  "update:multiplier": [value: number];
  "update:decimals": [value: number | undefined];
  "update:resolution": [value: string | undefined];
  "update:aggregation": [value: PieChartAggregation | undefined];
}>();

function getSource(slice: PieChartSlice): "device" | "insights" {
  return (slice as any).source ?? "device";
}

const hasInsightsSlices = computed(() =>
  props.slices.some((s) => getSource(s) === "insights")
);

function addSlice() {
  if (props.slices.length >= 8) return;
  emit("update:slices", [
    ...props.slices,
    { source: "device", deviceId: "", capabilityId: "", color: DEFAULT_COLORS[props.slices.length % DEFAULT_COLORS.length] } as PieChartSlice,
  ]);
}

function removeSlice(index: number) {
  const updated = [...props.slices];
  updated.splice(index, 1);
  emit("update:slices", updated);
}

function toggleSliceSource(index: number) {
  const updated = [...props.slices];
  const current = updated[index];
  const currentSource = getSource(current);
  if (currentSource === "device") {
    updated[index] = { source: "insights", logId: "", label: current.label, color: current.color } as PieChartSlice;
  } else {
    updated[index] = { source: "device", deviceId: "", capabilityId: "", label: current.label, color: current.color } as PieChartSlice;
  }
  emit("update:slices", updated);
}

function updateSliceDevice(index: number, val: { deviceId: string; capabilityId: string }) {
  const updated = [...props.slices];
  const s = updated[index] as any;
  updated[index] = { ...s, source: "device", deviceId: val.deviceId, capabilityId: val.capabilityId };
  emit("update:slices", updated);
}

function updateSliceLog(index: number, logId: string) {
  const updated = [...props.slices];
  const s = updated[index] as any;
  updated[index] = { ...s, source: "insights", logId };
  emit("update:slices", updated);
}

function updateSliceLabel(index: number, label: string) {
  const updated = [...props.slices];
  updated[index] = { ...updated[index], label: label || undefined };
  emit("update:slices", updated);
}

function updateSliceColor(index: number, color: string) {
  const updated = [...props.slices];
  updated[index] = { ...updated[index], color };
  emit("update:slices", updated);
}
</script>

<template>
  <div class="pie-config">
    <label class="config-label">Chart Style</label>
    <div class="style-picker">
      <button
        :class="['style-btn', { active: style === 'pie' }]"
        @click="emit('update:style', 'pie')"
      >Pie</button>
      <button
        :class="['style-btn', { active: style === 'doughnut' }]"
        @click="emit('update:style', 'doughnut')"
      >Doughnut</button>
    </div>

    <label class="config-label">Slices ({{ slices.length }}/8)</label>

    <div v-for="(slice, i) in slices" :key="i" class="slice-row">
      <div class="slice-header">
        <span class="slice-num">#{{ i + 1 }}</span>
        <button class="btn-remove" @click="removeSlice(i)">&times;</button>
      </div>

      <div class="source-toggle">
        <button
          :class="['source-btn', { active: getSource(slice) === 'device' }]"
          @click="getSource(slice) !== 'device' && toggleSliceSource(i)"
        >Device value</button>
        <button
          :class="['source-btn', { active: getSource(slice) === 'insights' }]"
          @click="getSource(slice) !== 'insights' && toggleSliceSource(i)"
        >Insights log</button>
      </div>

      <DeviceCapabilitySelect
        v-if="getSource(slice) === 'device'"
        capability-filter="number"
        :selected="(slice as any).deviceId ? { deviceId: (slice as any).deviceId, capabilityId: (slice as any).capabilityId } : null"
        @update:selected="updateSliceDevice(i, $event)"
      />

      <InsightLogSelect
        v-if="getSource(slice) === 'insights'"
        :selected="(slice as any).logId || null"
        @update:selected="updateSliceLog(i, $event)"
      />

      <div class="inline-row">
        <div class="inline-field">
          <label class="config-label">Color</label>
          <input
            type="color"
            class="color-input"
            :value="slice.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]"
            @input="updateSliceColor(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="inline-field flex-1">
          <label class="config-label">Label</label>
          <input
            type="text"
            class="text-input"
            placeholder="Auto from device/log"
            :value="slice.label || ''"
            @input="updateSliceLabel(i, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <button v-if="slices.length < 8" class="btn-add" @click="addSlice">
      + Add slice
    </button>

    <!-- Insights options: resolution + aggregation -->
    <template v-if="hasInsightsSlices">
      <label class="config-label">Time Period</label>
      <select
        class="text-input"
        :value="resolution || 'last24Hours'"
        @change="emit('update:resolution', ($event.target as HTMLSelectElement).value)"
      >
        <option value="lastHour">Last hour</option>
        <option value="last6Hours">Last 6 hours</option>
        <option value="last24Hours">Last 24 hours</option>
        <option value="last7Days">Last 7 days</option>
        <option value="last14Days">Last 14 days</option>
        <option value="last31Days">Last 31 days</option>
      </select>

      <label class="config-label">Aggregation</label>
      <div class="style-picker">
        <button
          :class="['style-btn', { active: (aggregation || 'sum') === 'sum' }]"
          @click="emit('update:aggregation', 'sum')"
        >Sum</button>
        <button
          :class="['style-btn', { active: aggregation === 'average' }]"
          @click="emit('update:aggregation', 'average')"
        >Average</button>
      </div>
    </template>

    <div class="inline-row">
      <div class="inline-field flex-1">
        <label class="config-label">Unit</label>
        <input
          type="text"
          class="text-input"
          placeholder="e.g. W, kWh"
          :value="unit"
          @input="emit('update:unit', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="inline-field flex-1">
        <label class="config-label">Multiplier</label>
        <input
          type="number"
          class="text-input"
          step="any"
          :value="multiplier"
          @input="emit('update:multiplier', Number(($event.target as HTMLInputElement).value) || 1)"
        />
      </div>
    </div>

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
.pie-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.style-picker {
  display: flex;
  gap: 6px;
}

.style-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.style-btn:hover {
  border-color: var(--accent);
}

.style-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #000;
}

.source-toggle {
  display: flex;
  gap: 4px;
}

.source-btn {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.source-btn:hover {
  border-color: var(--accent);
}

.source-btn.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-secondary));
  color: var(--text-primary);
}

.slice-row {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slice-num {
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

.text-input:focus {
  border-color: var(--accent);
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
