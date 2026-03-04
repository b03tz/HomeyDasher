<script setup lang="ts">
import InsightLogSelect from "../InsightLogSelect.vue";

defineProps<{
  logId: string;
  resolution: string;
  color: string;
  unit: string;
  multiplier: number;
  hideXAxis: boolean;
  decimals: number | undefined;
  secondaryLogId: string;
  secondaryColor: string;
  secondaryUnit: string;
  secondaryMultiplier: number;
}>();

const emit = defineEmits<{
  "update:logId": [value: string];
  "update:resolution": [value: string];
  "update:color": [value: string];
  "update:unit": [value: string];
  "update:multiplier": [value: number];
  "update:hideXAxis": [value: boolean];
  "update:decimals": [value: number | undefined];
  "update:secondaryLogId": [value: string];
  "update:secondaryColor": [value: string];
  "update:secondaryUnit": [value: string];
  "update:secondaryMultiplier": [value: number];
}>();

const RESOLUTIONS = [
  { value: "lastHour", label: "Last hour" },
  { value: "last6Hours", label: "Last 6 hours" },
  { value: "last24Hours", label: "Last 24 hours" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "last14Days", label: "Last 14 days" },
  { value: "last31Days", label: "Last 31 days" },
];

function removeSecondary() {
  emit("update:secondaryLogId", "");
  emit("update:secondaryUnit", "");
  emit("update:secondaryMultiplier", 1);
  emit("update:secondaryColor", "#ffb74d");
}
</script>

<template>
  <div class="chart-config">
    <label class="config-label">Insight Log</label>
    <InsightLogSelect
      :selected="logId || null"
      @update:selected="emit('update:logId', $event)"
    />

    <div class="inline-row">
      <div class="inline-field">
        <label class="config-label">Color</label>
        <input
          type="color"
          class="color-input"
          :value="color"
          @input="emit('update:color', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="inline-field flex-1">
        <label class="config-label">Unit</label>
        <input
          type="text"
          class="text-input"
          placeholder="e.g. W, kWh, &deg;C"
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

    <!-- Secondary dataset -->
    <template v-if="!secondaryLogId">
      <button class="btn-add-secondary" @click="emit('update:secondaryLogId', '__pending__')">
        + Add second dataset
      </button>
    </template>
    <template v-else>
      <div class="secondary-section">
        <div class="secondary-header">
          <label class="config-label">Second Dataset</label>
          <button class="btn-remove" @click="removeSecondary">Remove</button>
        </div>

        <InsightLogSelect
          :selected="secondaryLogId === '__pending__' ? null : secondaryLogId"
          @update:selected="emit('update:secondaryLogId', $event)"
        />

        <div class="inline-row">
          <div class="inline-field">
            <label class="config-label">Color</label>
            <input
              type="color"
              class="color-input"
              :value="secondaryColor"
              @input="emit('update:secondaryColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="inline-field flex-1">
            <label class="config-label">Unit</label>
            <input
              type="text"
              class="text-input"
              placeholder="e.g. W, kWh, &deg;C"
              :value="secondaryUnit"
              @input="emit('update:secondaryUnit', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="inline-field flex-1">
            <label class="config-label">Multiplier</label>
            <input
              type="number"
              class="text-input"
              step="any"
              :value="secondaryMultiplier"
              @input="emit('update:secondaryMultiplier', Number(($event.target as HTMLInputElement).value) || 1)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chart-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
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

.btn-add-secondary {
  margin-top: 4px;
  padding: 10px 12px;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-add-secondary:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.secondary-section {
  margin-top: 4px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.secondary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--danger, #ef5350);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 6px;
}

.btn-remove:hover {
  text-decoration: underline;
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
