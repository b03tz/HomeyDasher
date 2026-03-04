<script setup lang="ts">
import { useDashboardStore } from "../../stores/dashboard";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const dashboardStore = useDashboardStore();

function onColumnsChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  dashboardStore.updateGrid(value, dashboardStore.grid.rows);
}

function onRowsChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  dashboardStore.updateGrid(dashboardStore.grid.columns, value);
}

function onGapChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  dashboardStore.updateAppearance(value, dashboardStore.grid.borderRadius ?? 12);
}

function onRadiusChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  dashboardStore.updateAppearance(dashboardStore.grid.gap ?? 12, value);
}

async function resetLocations() {
  await dashboardStore.resetWidgetLocations();
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="settings-overlay" @click.self="emit('close')">
      <div class="settings-modal">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <div class="settings-body">
          <section class="settings-section">
            <h3 class="section-title">Grid Settings</h3>

            <div class="setting-row">
              <label class="setting-label" for="grid-columns">
                Columns
                <span class="setting-value">{{ dashboardStore.grid.columns }}</span>
              </label>
              <input
                id="grid-columns"
                type="range"
                min="3"
                max="12"
                :value="dashboardStore.grid.columns"
                class="setting-slider"
                @input="onColumnsChange"
              />
            </div>

            <div class="setting-row">
              <label class="setting-label" for="grid-rows">
                Rows
                <span class="setting-value">{{ dashboardStore.grid.rows }}</span>
              </label>
              <input
                id="grid-rows"
                type="range"
                min="3"
                max="12"
                :value="dashboardStore.grid.rows"
                class="setting-slider"
                @input="onRowsChange"
              />
            </div>
          </section>

          <section class="settings-section">
            <h3 class="section-title">Appearance</h3>

            <div class="setting-row">
              <label class="setting-label" for="grid-gap">
                Grid spacing
                <span class="setting-value">{{ dashboardStore.grid.gap ?? 12 }}px</span>
              </label>
              <input
                id="grid-gap"
                type="range"
                min="0"
                max="25"
                :value="dashboardStore.grid.gap ?? 12"
                class="setting-slider"
                @input="onGapChange"
              />
            </div>

            <div class="setting-row">
              <label class="setting-label" for="border-radius">
                Border radius
                <span class="setting-value">{{ dashboardStore.grid.borderRadius ?? 12 }}px</span>
              </label>
              <input
                id="border-radius"
                type="range"
                min="0"
                max="12"
                :value="dashboardStore.grid.borderRadius ?? 12"
                class="setting-slider"
                @input="onRadiusChange"
              />
            </div>
          </section>

          <section class="settings-section danger-zone">
            <h3 class="section-title danger-title">Danger Zone</h3>
            <button class="danger-btn" @click="resetLocations">
              Reset all widget locations
            </button>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.settings-header h2 {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--text-primary);
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 20px;
}

.settings-section {
  margin-bottom: 28px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.setting-row {
  margin-bottom: 16px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.setting-value {
  font-weight: 700;
  color: var(--accent);
  font-size: 1rem;
  min-width: 24px;
  text-align: right;
}

.setting-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  min-height: 48px;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.setting-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

.danger-zone {
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.danger-title {
  color: var(--danger);
}

.danger-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
}

.danger-btn:hover {
  background: var(--danger);
  color: white;
}
</style>
