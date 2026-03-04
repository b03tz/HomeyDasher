<script setup lang="ts">
import DeviceCapabilitySelect from "../DeviceCapabilitySelect.vue";

defineProps<{
  deviceId: string;
  capabilityId: string;
  period: string;
  updateInterval: string;
  color: string;
  negativeColor: string;
  unit: string;
  multiplier: number;
  hideXAxis: boolean;
  decimals: number | undefined;
  secondaryDeviceId: string;
  secondaryCapabilityId: string;
  secondaryColor: string;
  secondaryNegativeColor: string;
  secondaryUnit: string;
  secondaryMultiplier: number;
}>();

const emit = defineEmits<{
  "update:deviceId": [value: string];
  "update:capabilityId": [value: string];
  "update:period": [value: string];
  "update:updateInterval": [value: string];
  "update:color": [value: string];
  "update:negativeColor": [value: string];
  "update:unit": [value: string];
  "update:multiplier": [value: number];
  "update:hideXAxis": [value: boolean];
  "update:decimals": [value: number | undefined];
  "update:secondaryDeviceId": [value: string];
  "update:secondaryCapabilityId": [value: string];
  "update:secondaryColor": [value: string];
  "update:secondaryNegativeColor": [value: string];
  "update:secondaryUnit": [value: string];
  "update:secondaryMultiplier": [value: number];
}>();

const PERIODS = [
  { value: "last1Min", label: "Last 1 minute" },
  { value: "last5Min", label: "Last 5 minutes" },
  { value: "last30Min", label: "Last 30 minutes" },
  { value: "lastHour", label: "Last hour" },
];

const UPDATE_INTERVALS = [
  { value: "live", label: "When new data" },
  { value: "2s", label: "Every 2 seconds" },
  { value: "5s", label: "Every 5 seconds" },
  { value: "10s", label: "Every 10 seconds" },
  { value: "30s", label: "Every 30 seconds" },
  { value: "1min", label: "Every 1 minute" },
];

function onPrimarySelect(val: { deviceId: string; capabilityId: string } | null) {
  emit("update:deviceId", val?.deviceId ?? "");
  emit("update:capabilityId", val?.capabilityId ?? "");
}

function onSecondarySelect(val: { deviceId: string; capabilityId: string } | null) {
  emit("update:secondaryDeviceId", val?.deviceId ?? "");
  emit("update:secondaryCapabilityId", val?.capabilityId ?? "");
}

function addSecondary() {
  emit("update:secondaryDeviceId", "__pending__");
  emit("update:secondaryCapabilityId", "");
}

function removeSecondary() {
  emit("update:secondaryDeviceId", "");
  emit("update:secondaryCapabilityId", "");
  emit("update:secondaryUnit", "");
  emit("update:secondaryMultiplier", 1);
  emit("update:secondaryColor", "#ffb74d");
  emit("update:secondaryNegativeColor", "#ef5350");
}
</script>

<template>
  <div class="live-chart-config">
    <label class="config-label">Device &amp; Capability</label>
    <DeviceCapabilitySelect
      capability-filter="number"
      :selected="deviceId ? { deviceId, capabilityId } : null"
      @update:selected="onPrimarySelect"
    />

    <label class="config-label">Period</label>
    <select
      class="select-input"
      :value="period"
      @change="emit('update:period', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="p in PERIODS" :key="p.value" :value="p.value">
        {{ p.label }}
      </option>
    </select>

    <label class="config-label">Update every</label>
    <select
      class="select-input"
      :value="updateInterval"
      @change="emit('update:updateInterval', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="ui in UPDATE_INTERVALS" :key="ui.value" :value="ui.value">
        {{ ui.label }}
      </option>
    </select>

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
      <div class="inline-field">
        <label class="config-label">Neg. Color</label>
        <input
          type="color"
          class="color-input"
          :value="negativeColor"
          @input="emit('update:negativeColor', ($event.target as HTMLInputElement).value)"
        />
      </div>
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
    <template v-if="!secondaryDeviceId">
      <button class="btn-add-secondary" @click="addSecondary">
        + Add second dataset
      </button>
    </template>
    <template v-else>
      <div class="secondary-section">
        <div class="secondary-header">
          <label class="config-label">Second Dataset</label>
          <button class="btn-remove" @click="removeSecondary">Remove</button>
        </div>

        <DeviceCapabilitySelect
          capability-filter="number"
          :selected="secondaryDeviceId && secondaryDeviceId !== '__pending__' ? { deviceId: secondaryDeviceId, capabilityId: secondaryCapabilityId } : null"
          @update:selected="onSecondarySelect"
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
          <div class="inline-field">
            <label class="config-label">Neg. Color</label>
            <input
              type="color"
              class="color-input"
              :value="secondaryNegativeColor"
              @input="emit('update:secondaryNegativeColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="inline-field flex-1">
            <label class="config-label">Unit</label>
            <input
              type="text"
              class="text-input"
              placeholder="e.g. W, kWh"
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
.live-chart-config {
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
