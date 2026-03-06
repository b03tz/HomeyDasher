<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDashboardStore } from "../../stores/dashboard";
import { useDeviceStore } from "../../stores/devices";
import { useZoneStore } from "../../stores/zones";
import { useToast } from "../../composables/useToast";
import { resolveIconName } from "../../utils/iconResolver";
import { Icon } from "@iconify/vue";
import IconPicker from "./IconPicker.vue";
import ImagePicker from "./ImagePicker.vue";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; openDevInspector: [] }>();

// Make modal transparent while dragging any slider.
const sliderActive = ref(false);
let sliderTimer = 0;
function onSliderInput() {
  sliderActive.value = true;
  clearTimeout(sliderTimer);
  sliderTimer = window.setTimeout(() => { sliderActive.value = false; }, 1000);
}
function onSliderChange() {
  clearTimeout(sliderTimer);
  sliderActive.value = false;
}

const dashboardStore = useDashboardStore();
const deviceStore = useDeviceStore();
const zoneStore = useZoneStore();
const toast = useToast();

// Tab state
const activeTab = ref<"dashboards" | "devices" | "system">("dashboards");

// Backup & Restore
const backupFileInput = ref<HTMLInputElement | null>(null);

async function doExport() {
  try {
    await dashboardStore.exportBackup();
    toast.show("Backup exported", "success");
  } catch {
    toast.show("Export failed", "error");
  }
}

async function doImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    await dashboardStore.importBackup(file);
    toast.show("Backup restored successfully", "success");
  } catch {
    toast.show("Import failed — invalid backup file", "error");
  }
  input.value = "";
}

// Dashboard management state
const iconPickerOpen = ref(false);
const iconPickerTargetId = ref("");

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

function onToggleBorders() {
  const current = dashboardStore.grid.showBorders !== false;
  dashboardStore.updateAppearance(
    dashboardStore.grid.gap ?? 12,
    dashboardStore.grid.borderRadius ?? 12,
    !current,
  );
}

// Reset widget locations with confirm pattern
const resetPending = ref(false);
let resetTimer = 0;

function handleReset() {
  if (resetPending.value) {
    clearTimeout(resetTimer);
    resetPending.value = false;
    dashboardStore.resetWidgetLocations();
    toast.show("Widget locations reset", "success");
  } else {
    resetPending.value = true;
    resetTimer = window.setTimeout(() => {
      resetPending.value = false;
    }, 3000);
  }
}

// Dashboard management
async function addDashboard() {
  await dashboardStore.createDashboard("New dashboard");
  // Switch to the newly created dashboard (it's the last one)
  const newDb = dashboardStore.dashboards[dashboardStore.dashboards.length - 1];
  if (newDb) {
    await dashboardStore.switchDashboard(newDb.id);
  }
  toast.show("Dashboard created", "success");
}

// Active dashboard name — editable on the right, live-reflects to left
const activeDashboardName = computed({
  get: () => {
    const db = dashboardStore.dashboards.find((d) => d.id === dashboardStore.activeDashboardId);
    return db?.name ?? "";
  },
  set: () => { /* handled by onNameInput */ },
});

let nameDebounce = 0;
function onNameInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  // Immediately update local store for live reflection
  const db = dashboardStore.dashboards.find((d) => d.id === dashboardStore.activeDashboardId);
  if (db) db.name = value;
  // Debounce the save to backend
  clearTimeout(nameDebounce);
  nameDebounce = window.setTimeout(() => {
    const trimmed = value.trim();
    if (trimmed) {
      dashboardStore.updateDashboardEntry(dashboardStore.activeDashboardId, { name: trimmed });
    }
  }, 400);
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

// Delete dashboard with confirm pattern
const deletePending = ref(false);
let deleteTimer = 0;

function handleDelete() {
  if (dashboardStore.dashboards.length <= 1) return;
  if (deletePending.value) {
    clearTimeout(deleteTimer);
    deletePending.value = false;
    dashboardStore.deleteDashboard(dashboardStore.activeDashboardId);
    toast.show("Dashboard deleted", "success");
  } else {
    deletePending.value = true;
    deleteTimer = window.setTimeout(() => {
      deletePending.value = false;
    }, 3000);
  }
}

// Dashboard background
const bgPickerOpen = ref(false);

function onBgImagePicked(url: string) {
  dashboardStore.updateBackgroundImage({
    url,
    overlayOpacity: dashboardStore.backgroundImage?.overlayOpacity ?? 40,
  });
}

function removeBgImage() {
  dashboardStore.updateBackgroundImage(undefined);
}

function onOverlayOpacityChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  if (!dashboardStore.backgroundImage?.url) return;
  dashboardStore.updateBackgroundImage({
    ...dashboardStore.backgroundImage,
    overlayOpacity: value,
  });
}

function onBlurChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  if (!dashboardStore.backgroundImage?.url) return;
  dashboardStore.updateBackgroundImage({
    ...dashboardStore.backgroundImage,
    blur: value,
  });
}

function onWidgetBlurChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  dashboardStore.updateWidgetBlur(value);
}

// Layout mode
function toggleLayoutMode() {
  const newMode = dashboardStore.layoutMode === "grid" ? "freeform" : "grid";
  dashboardStore.updateLayoutMode(newMode as any);
}

// Device overrides — zone-based
const activeZoneId = ref("");
const editingDeviceId = ref("");
const editingDeviceName = ref("");

// Build nested zone tree, only including zones that have devices (or have children with devices)
interface ZoneNode {
  id: string;
  name: string;
  depth: number;
  hasDevices: boolean;
  children: ZoneNode[];
}

const zoneTree = computed(() => {
  const deviceZoneIds = new Set(Object.values(deviceStore.devices).map((d) => d.zoneId));
  const allZones = zoneStore.sortedZones;
  const byParent: Record<string, typeof allZones> = {};
  for (const z of allZones) {
    const key = z.parent ?? "__root__";
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(z);
  }

  function build(parentId: string, depth: number): ZoneNode[] {
    const children = byParent[parentId] ?? [];
    const nodes: ZoneNode[] = [];
    for (const z of children) {
      const subtree = build(z.id, depth + 1);
      const hasDevices = deviceZoneIds.has(z.id);
      if (hasDevices || subtree.length > 0) {
        nodes.push({ id: z.id, name: z.name, depth, hasDevices, children: subtree });
      }
    }
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    return nodes;
  }
  return build("__root__", 0);
});

// Flatten tree for rendering (with depth info)
interface FlatZoneRow {
  id: string;
  name: string;
  depth: number;
  hasDevices: boolean;
}

const flatZoneList = computed(() => {
  const result: FlatZoneRow[] = [];
  function walk(nodes: ZoneNode[]) {
    for (const n of nodes) {
      result.push({ id: n.id, name: n.name, depth: n.depth, hasDevices: n.hasDevices });
      walk(n.children);
    }
  }
  walk(zoneTree.value);
  return result;
});

// Auto-select first zone that has devices
watch(flatZoneList, (list) => {
  const withDevices = list.filter((z) => z.hasDevices);
  if (withDevices.length > 0 && !withDevices.find((z) => z.id === activeZoneId.value)) {
    activeZoneId.value = withDevices[0].id;
  }
}, { immediate: true });

const devicesInZone = computed(() => {
  if (!activeZoneId.value) return [];
  return Object.values(deviceStore.devices)
    .filter((d) => d.zoneId === activeZoneId.value)
    .sort((a, b) => deviceStore.getDeviceName(a.id).localeCompare(deviceStore.getDeviceName(b.id)));
});

function deviceOverrideCount(zoneId: string): number {
  return Object.values(deviceStore.devices)
    .filter((d) => d.zoneId === zoneId && deviceStore.deviceOverrides[d.id])
    .length;
}

function startEditDevice(deviceId: string) {
  editingDeviceId.value = deviceId;
  editingDeviceName.value = deviceStore.getDeviceName(deviceId);
}

async function saveDeviceName(deviceId: string) {
  const name = editingDeviceName.value.trim();
  if (name && name !== deviceStore.devices[deviceId]?.name) {
    await deviceStore.setDeviceOverride(deviceId, name);
    toast.show("Device name updated", "success");
  } else if (name === deviceStore.devices[deviceId]?.name) {
    await deviceStore.clearDeviceOverride(deviceId);
  }
  editingDeviceId.value = "";
}

async function clearOverride(deviceId: string) {
  await deviceStore.clearDeviceOverride(deviceId);
  editingDeviceId.value = "";
  toast.show("Name reverted to original", "success");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="settings-overlay" :class="{ 'peek-through': sliderActive }" @click.self="emit('close')">
      <div class="settings-modal" :class="{ 'peek-through': sliderActive }" @input.capture="($event.target as HTMLElement)?.matches?.('input[type=range]') && onSliderInput()" @change.capture="($event.target as HTMLElement)?.matches?.('input[type=range]') && onSliderChange()">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="emit('close')">&times;</button>
        </div>

        <!-- Tab bar -->
        <div class="tab-bar">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'dashboards' }"
            @click="activeTab = 'dashboards'"
          >Dashboards</button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'devices' }"
            @click="activeTab = 'devices'"
          >Devices</button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'system' }"
            @click="activeTab = 'system'"
          >System</button>
        </div>

        <div class="settings-body">
          <!-- ═══════════ DASHBOARDS TAB ═══════════ -->
          <template v-if="activeTab === 'dashboards'">
            <div class="two-panel">
              <!-- Left: dashboard list -->
              <div class="panel-left">
                <h3 class="section-title">Dashboards</h3>

                <div class="dashboard-list">
                  <button
                    v-for="db in dashboardStore.dashboards"
                    :key="db.id"
                    class="dashboard-select-row"
                    :class="{ active: db.id === dashboardStore.activeDashboardId }"
                    @click="switchTo(db.id)"
                  >
                    <span class="dashboard-icon-inline" @click.stop="openIconPicker(db.id)">
                      <Icon :icon="resolveIconName(db.icon) ?? 'mdi:view-dashboard'" :width="16" :height="16" />
                    </span>
                    <span class="dashboard-select-name">{{ db.name }}</span>
                  </button>
                </div>

                <button
                  class="add-dashboard-btn"
                  @click="addDashboard"
                >
                  + Add Dashboard
                </button>
              </div>

              <!-- Right: configuration -->
              <div class="panel-right">
                <!-- Dashboard name -->
                <section class="settings-section">
                  <h3 class="section-title">Dashboard Name</h3>
                  <input
                    class="dashboard-name-field"
                    :value="activeDashboardName"
                    @input="onNameInput"
                    spellcheck="false"
                  />
                </section>

                <!-- Layout Mode -->
                <section class="settings-section">
                  <h3 class="section-title">Layout Mode</h3>
                  <div class="setting-row toggle-row">
                    <span class="setting-label-text">Freeform positioning</span>
                    <button
                      class="toggle-switch"
                      :class="{ active: dashboardStore.layoutMode === 'freeform' }"
                      @click="toggleLayoutMode"
                      role="switch"
                      :aria-checked="dashboardStore.layoutMode === 'freeform'"
                    >
                      <span class="toggle-knob" />
                    </button>
                  </div>
                  <p v-if="dashboardStore.layoutMode === 'freeform'" class="setting-hint">
                    Widgets use absolute pixel positioning. Drag to move, resize from edges/corners.
                  </p>
                </section>

                <!-- Dashboard Background -->
                <section class="settings-section">
                  <h3 class="section-title">Background</h3>
                  <div v-if="dashboardStore.backgroundImage?.url" class="bg-preview-row">
                    <div class="bg-thumb">
                      <img :src="dashboardStore.backgroundImage.url" alt="Background" />
                    </div>
                    <div class="bg-actions">
                      <button class="dash-action-btn" @click="bgPickerOpen = true">Change</button>
                      <button class="bg-remove-btn" title="Remove background" @click="removeBgImage">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button v-else class="add-dashboard-btn" @click="bgPickerOpen = true">
                    + Choose Image
                  </button>

                  <div v-if="dashboardStore.backgroundImage?.url" class="setting-row" style="margin-top: 12px">
                    <label class="setting-label" for="bg-overlay">
                      Overlay opacity
                      <span class="setting-value">{{ dashboardStore.backgroundImage?.overlayOpacity ?? 40 }}%</span>
                    </label>
                    <input
                      id="bg-overlay"
                      type="range"
                      min="0"
                      max="100"
                      :value="dashboardStore.backgroundImage?.overlayOpacity ?? 40"
                      class="setting-slider"
                      @input="onOverlayOpacityChange"
                    />
                  </div>

                  <div v-if="dashboardStore.backgroundImage?.url" class="setting-row">
                    <label class="setting-label" for="bg-blur">
                      Blur
                      <span class="setting-value">{{ dashboardStore.backgroundImage?.blur ?? 0 }}px</span>
                    </label>
                    <input
                      id="bg-blur"
                      type="range"
                      min="0"
                      max="20"
                      :value="dashboardStore.backgroundImage?.blur ?? 0"
                      class="setting-slider"
                      @input="onBlurChange"
                    />
                  </div>

                  <div v-if="dashboardStore.backgroundImage?.url" class="setting-row">
                    <label class="setting-label" for="widget-blur">
                      Widget blur
                      <span class="setting-value">{{ dashboardStore.widgetBlur ?? 18 }}px</span>
                    </label>
                    <input
                      id="widget-blur"
                      type="range"
                      min="0"
                      max="20"
                      :value="dashboardStore.widgetBlur ?? 18"
                      class="setting-slider"
                      @input="onWidgetBlurChange"
                    />
                  </div>
                </section>

                <section v-if="dashboardStore.layoutMode !== 'freeform'" class="settings-section">
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

                  <div class="setting-row toggle-row">
                    <span class="setting-label-text">Show borders</span>
                    <button
                      class="toggle-switch"
                      :class="{ active: dashboardStore.grid.showBorders !== false }"
                      @click="onToggleBorders"
                      role="switch"
                      :aria-checked="dashboardStore.grid.showBorders !== false"
                    >
                      <span class="toggle-knob" />
                    </button>
                  </div>
                </section>

                <!-- Danger zone -->
                <section class="settings-section danger-zone">
                  <h3 class="section-title danger-title">Danger Zone</h3>
                  <div class="danger-actions">
                    <button class="danger-btn" @click="handleReset">
                      {{ resetPending ? 'Click to confirm' : 'Reset widget locations' }}
                    </button>
                    <button
                      class="danger-btn"
                      :disabled="dashboardStore.dashboards.length <= 1"
                      @click="handleDelete"
                    >
                      {{ deletePending ? 'Click to confirm' : 'Delete dashboard' }}
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <IconPicker
              :open="iconPickerOpen"
              :model-value="dashboardStore.dashboards.find(d => d.id === iconPickerTargetId)?.icon"
              @update:model-value="onIconPicked"
              @close="iconPickerOpen = false"
            />

            <ImagePicker
              :open="bgPickerOpen"
              :model-value="dashboardStore.backgroundImage?.url"
              @update:model-value="onBgImagePicked"
              @close="bgPickerOpen = false"
            />
          </template>

          <!-- ═══════════ DEVICES TAB ═══════════ -->
          <template v-if="activeTab === 'devices'">
            <div class="two-panel devices-panel">
              <!-- Left: zone tree -->
              <div class="panel-left">
                <h3 class="section-title">Rooms</h3>
                <div class="zone-list">
                  <button
                    v-for="zone in flatZoneList"
                    :key="zone.id"
                    class="zone-row"
                    :class="{ active: zone.id === activeZoneId, 'zone-parent': !zone.hasDevices }"
                    :style="{ paddingLeft: (12 + zone.depth * 16) + 'px' }"
                    @click="zone.hasDevices && (activeZoneId = zone.id, editingDeviceId = '')"
                  >
                    <span class="zone-name">{{ zone.name }}</span>
                    <span v-if="deviceOverrideCount(zone.id)" class="zone-badge">{{ deviceOverrideCount(zone.id) }}</span>
                  </button>
                </div>
              </div>

              <!-- Right: devices in selected zone -->
              <div class="panel-right">
                <h3 class="section-title">{{ zoneStore.zones[activeZoneId]?.name ?? 'Devices' }}</h3>

                <div class="device-override-list">
                  <div
                    v-for="device in devicesInZone"
                    :key="device.id"
                    class="device-override-row"
                  >
                    <template v-if="editingDeviceId === device.id">
                      <input
                        v-model="editingDeviceName"
                        class="dashboard-name-input"
                        @blur="saveDeviceName(device.id)"
                        @keyup.enter="saveDeviceName(device.id)"
                        autofocus
                      />
                    </template>
                    <template v-else>
                      <div class="device-override-names" @click="startEditDevice(device.id)">
                        <span
                          class="device-display-name"
                          :class="{ overridden: !!deviceStore.deviceOverrides[device.id] }"
                        >{{ deviceStore.getDeviceName(device.id) }}</span>
                        <span
                          v-if="deviceStore.deviceOverrides[device.id]"
                          class="device-original-name"
                        >{{ device.name }}</span>
                      </div>
                    </template>

                    <span class="device-type-label">{{ device.class }}</span>

                    <button
                      v-if="deviceStore.deviceOverrides[device.id] && editingDeviceId !== device.id"
                      class="clear-override-btn"
                      title="Revert to original name"
                      @click="clearOverride(device.id)"
                    >&times;</button>
                    <button
                      v-else-if="editingDeviceId !== device.id"
                      class="edit-device-btn"
                      title="Edit device name"
                      @click="startEditDevice(device.id)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                    </button>
                  </div>

                  <p v-if="devicesInZone.length === 0" class="no-devices">No devices in this room</p>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══════════ SYSTEM TAB ═══════════ -->
          <template v-if="activeTab === 'system'">
            <section class="settings-section">
              <h3 class="section-title">Backup &amp; Restore</h3>
              <div class="backup-actions">
                <button class="backup-btn" @click="doExport">Export Backup</button>
                <button class="backup-btn" @click="backupFileInput?.click()">Import Backup</button>
                <input
                  ref="backupFileInput"
                  type="file"
                  accept=".json"
                  style="display: none"
                  @change="doImport"
                />
              </div>
            </section>

            <section class="settings-section">
              <h3 class="section-title">Developer</h3>
              <button class="dev-inspector-btn" @click="emit('openDevInspector'); emit('close')">
                Open Device Inspector
              </button>
            </section>
          </template>
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
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: background 0.25s;
}

.settings-overlay.peek-through {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: none;
}

.settings-modal.peek-through {
  opacity: 0.15;
  pointer-events: auto;
}

.settings-modal {
  background: rgba(12, 18, 30, 0.85);
  border: 1px solid rgba(79, 195, 247, 0.12);
  border-radius: var(--radius);
  transition: opacity 0.25s;
  width: 92%;
  max-width: 820px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(79, 195, 247, 0.06);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px 12px;
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

/* Tab bar */
.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
}

.tab-btn.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 20px;
}

/* Two-panel layout */
.two-panel {
  display: flex;
  gap: 20px;
  min-height: 0;
}

.two-panel.devices-panel {
  height: 55vh;
}

.two-panel.devices-panel .panel-left,
.two-panel.devices-panel .panel-right {
  overflow-y: auto;
}

.panel-left {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
}

.panel-right {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
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
  height: 48px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.setting-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  border: none;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(79, 195, 247, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.15);
  margin-top: -10px;
  transition: box-shadow 0.2s, transform 0.15s;
}

.setting-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 14px rgba(79, 195, 247, 0.6), 0 2px 6px rgba(0, 0, 0, 0.3);
  transform: scale(1.1);
}

.setting-slider::-moz-range-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  border: none;
}

.setting-slider::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(79, 195, 247, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.15);
}

/* Toggle switch */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-label-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: rgba(79, 195, 247, 0.25);
  border-color: rgba(79, 195, 247, 0.5);
  box-shadow: 0 0 10px rgba(79, 195, 247, 0.2);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
}

.toggle-switch.active .toggle-knob {
  transform: translateX(20px);
  background: var(--accent);
  box-shadow: 0 0 6px rgba(79, 195, 247, 0.5);
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

.danger-actions {
  display: flex;
  gap: 8px;
}

.danger-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: background 0.2s, color 0.2s;
}

.danger-btn:hover:not(:disabled) {
  background: var(--danger);
  color: white;
}

.danger-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Dashboard management */
.dashboard-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.dashboard-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.dashboard-select-row:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.dashboard-select-row.active {
  background: var(--bg-card);
  color: var(--accent);
  border: 1px solid var(--accent);
}

.dashboard-icon-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.dashboard-icon-inline:hover {
  opacity: 1;
}

.dashboard-select-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-name-field {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s;
}

.dashboard-name-field:focus {
  border-color: var(--accent);
}

.dashboard-name-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
  min-width: 0;
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

.backup-actions {
  display: flex;
  gap: 8px;
}

.backup-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
}

.backup-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Background preview */
.bg-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bg-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.bg-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bg-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.bg-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.bg-remove-btn:hover {
  border-color: var(--danger);
  background: rgba(239, 83, 80, 0.1);
}

.setting-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  opacity: 0.7;
  margin-top: 8px;
  line-height: 1.4;
}

/* Zone list (Devices tab left panel) */
.zone-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zone-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.zone-row:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.zone-row.active {
  background: var(--bg-card);
  color: var(--accent);
  border: 1px solid var(--accent);
}

.zone-row.zone-parent {
  opacity: 0.6;
  cursor: default;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 8px;
  padding-bottom: 4px;
}

.zone-row.zone-parent:hover {
  background: transparent;
  color: var(--text-secondary);
}

.zone-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zone-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

/* Device overrides */
.device-override-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-override-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.device-type-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  white-space: nowrap;
}

.device-override-names {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.device-override-names:hover .device-display-name {
  color: var(--accent);
}

.device-display-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.device-display-name.overridden {
  color: var(--accent);
}

.device-original-name {
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}

.device-override-row:hover .edit-device-btn {
  opacity: 1;
}

.edit-device-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.clear-override-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1.1rem;
  line-height: 1;
  transition: color 0.15s, border-color 0.15s;
}

.clear-override-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.no-devices {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px;
  font-size: 0.9rem;
}
</style>
