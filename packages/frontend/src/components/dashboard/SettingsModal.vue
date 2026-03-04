<script setup lang="ts">
import { ref } from "vue";
import { useDashboardStore } from "../../stores/dashboard";
import { useToast } from "../../composables/useToast";
import { resolveIcon } from "../../utils/iconResolver";
import { LayoutDashboard } from "lucide-vue-next";
import IconPicker from "./IconPicker.vue";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; openDevInspector: [] }>();

const dashboardStore = useDashboardStore();
const toast = useToast();

// Dashboard management state
const newDashboardName = ref("");
const addingDashboard = ref(false);
const iconPickerOpen = ref(false);
const iconPickerTargetId = ref("");
const editingNameId = ref("");
const editingNameValue = ref("");

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

// Dashboard management
async function addDashboard() {
  const name = newDashboardName.value.trim();
  if (!name) return;
  await dashboardStore.createDashboard(name);
  newDashboardName.value = "";
  addingDashboard.value = false;
  toast.show("Dashboard created", "success");
}

function startEditName(id: string, currentName: string) {
  editingNameId.value = id;
  editingNameValue.value = currentName;
}

async function saveName(id: string) {
  const name = editingNameValue.value.trim();
  if (name) {
    await dashboardStore.updateDashboardEntry(id, { name });
  }
  editingNameId.value = "";
}

function openIconPicker(id: string) {
  iconPickerTargetId.value = id;
  iconPickerOpen.value = true;
}

async function onIconPicked(iconName: string) {
  if (iconPickerTargetId.value) {
    await dashboardStore.updateDashboardEntry(iconPickerTargetId.value, { icon: iconName });
  }
}

async function switchTo(id: string) {
  await dashboardStore.switchDashboard(id);
  toast.show("Dashboard switched", "success");
}

async function removeDashboard(id: string) {
  if (dashboardStore.dashboards.length <= 1) return;
  if (!confirm("Delete this dashboard and all its widgets?")) return;
  await dashboardStore.deleteDashboard(id);
  toast.show("Dashboard deleted", "success");
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
          <!-- Dashboards section -->
          <section class="settings-section">
            <h3 class="section-title">Dashboards</h3>

            <div class="dashboard-list">
              <div
                v-for="db in dashboardStore.dashboards"
                :key="db.id"
                class="dashboard-row"
                :class="{ active: db.id === dashboardStore.activeDashboardId }"
              >
                <button class="dashboard-icon-btn" @click="openIconPicker(db.id)">
                  <component
                    :is="db.icon ? resolveIcon(db.icon) || LayoutDashboard : LayoutDashboard"
                    :size="18"
                  />
                </button>

                <div class="dashboard-name" v-if="editingNameId !== db.id" @click="startEditName(db.id, db.name)">
                  {{ db.name }}
                </div>
                <input
                  v-else
                  v-model="editingNameValue"
                  class="dashboard-name-input"
                  @blur="saveName(db.id)"
                  @keyup.enter="saveName(db.id)"
                  autofocus
                />

                <span v-if="db.id === dashboardStore.activeDashboardId" class="active-badge">Active</span>

                <div class="dashboard-actions">
                  <button
                    v-if="db.id !== dashboardStore.activeDashboardId"
                    class="dash-action-btn"
                    title="Switch to this dashboard"
                    @click="switchTo(db.id)"
                  >
                    Switch
                  </button>
                  <button
                    class="dash-action-btn danger"
                    title="Delete dashboard"
                    :disabled="dashboardStore.dashboards.length <= 1"
                    @click="removeDashboard(db.id)"
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>

            <div v-if="addingDashboard" class="add-dashboard-row">
              <input
                v-model="newDashboardName"
                class="dashboard-name-input"
                placeholder="Dashboard name..."
                @keyup.enter="addDashboard"
                autofocus
              />
              <button class="dash-action-btn" @click="addDashboard">Add</button>
              <button class="dash-action-btn" @click="addingDashboard = false">Cancel</button>
            </div>
            <button
              v-else
              class="add-dashboard-btn"
              @click="addingDashboard = true"
            >
              + Add Dashboard
            </button>
          </section>

          <IconPicker
            :open="iconPickerOpen"
            :model-value="dashboardStore.dashboards.find(d => d.id === iconPickerTargetId)?.icon"
            @update:model-value="onIconPicked"
            @close="iconPickerOpen = false"
          />

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

          <section class="settings-section">
            <h3 class="section-title">Developer</h3>
            <button class="dev-inspector-btn" @click="emit('openDevInspector'); emit('close')">
              Open Device Inspector
            </button>
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

.dev-inspector-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  font-family: monospace;
}

.dev-inspector-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
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

/* Dashboard management */
.dashboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.dashboard-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.dashboard-row.active {
  border-color: var(--accent);
}

.dashboard-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.dashboard-icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.dashboard-name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-name:hover {
  color: var(--accent);
}

.dashboard-name-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  min-width: 0;
}

.active-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.dash-action-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  min-height: 32px;
}

.dash-action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.dash-action-btn.danger {
  font-size: 1.1rem;
  line-height: 1;
  padding: 4px 8px;
}

.dash-action-btn.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.dash-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.add-dashboard-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-dashboard-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 40px;
}

.add-dashboard-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
