<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSocket } from "../composables/useSocket";
import { useDashboardStore } from "../stores/dashboard";
import type { DashboardWidget } from "@homecontrol/shared";
import DashboardGrid from "../components/dashboard/DashboardGrid.vue";
import AddWidgetWizard from "../components/dashboard/AddWidgetWizard.vue";
import DevInspector from "../components/dashboard/DevInspector.vue";
import SettingsModal from "../components/dashboard/SettingsModal.vue";

const { socket, homeyStatus } = useSocket();
const socketConnected = ref(socket.connected);
const onConnect = () => { socketConnected.value = true; };
const onDisconnect = () => { socketConnected.value = false; };
socket.on("connect", onConnect);
socket.on("disconnect", onDisconnect);
onUnmounted(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
});

const statusClass = computed(() => {
  if (!socketConnected.value) return "disconnected";
  if (homeyStatus.value === "reconnecting") return "reconnecting";
  if (homeyStatus.value === "connected") return "online";
  return "disconnected";
});

const statusTitle = computed(() => {
  if (!socketConnected.value) return "Server disconnected";
  if (homeyStatus.value === "reconnecting") return "Reconnecting to Homey...";
  if (homeyStatus.value === "connected") return "Connected";
  return "Homey disconnected";
});
const dashboardStore = useDashboardStore();

const wizardOpen = ref(false);
const editingWidget = ref<DashboardWidget | null>(null);
const devInspectorOpen = ref(false);
const settingsOpen = ref(false);

onMounted(() => {
  dashboardStore.fetchConfig();
  dashboardStore.fetchDashboard();
});

function openAddWizard() {
  editingWidget.value = null;
  wizardOpen.value = true;
}

function openEditWizard(widgetId: string) {
  const widget = dashboardStore.widgets.find((w) => w.id === widgetId);
  if (widget) {
    editingWidget.value = widget;
    wizardOpen.value = true;
  }
}

function closeWizard() {
  wizardOpen.value = false;
  editingWidget.value = null;
}

const isEmpty = computed(() => dashboardStore.loaded && dashboardStore.widgets.length === 0);

function onWidgetPlaced() {
  dashboardStore.editMode = true;
}
</script>

<template>
  <div class="dashboard">
    <header class="app-header">
      <h1>HomeControl</h1>
      <div class="header-actions">
        <button class="dev-btn" @click="devInspectorOpen = true">DEV</button>
        <button
          class="header-icon-btn"
          aria-label="Settings"
          @click="settingsOpen = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          v-if="!dashboardStore.editMode && !dashboardStore.pendingWidget"
          class="header-icon-btn"
          aria-label="Add widget"
          @click="openAddWizard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          class="edit-btn"
          :class="{ active: dashboardStore.editMode }"
          @click="dashboardStore.toggleEditMode()"
        >
          {{ dashboardStore.editMode ? "Done" : "Edit" }}
        </button>
        <span class="status-dot" :class="statusClass" :title="statusTitle" />
      </div>
    </header>

    <main class="content">
      <p v-if="!dashboardStore.loaded" class="empty">Loading dashboard...</p>

      <template v-else>
        <DashboardGrid
          :widgets="dashboardStore.widgets"
          @edit-widget="openEditWizard"
          @placed="onWidgetPlaced"
        />

        <p v-if="isEmpty" class="empty">
          No widgets yet. Click + to get started.
        </p>
      </template>
    </main>

    <AddWidgetWizard
      :open="wizardOpen"
      :edit-widget="editingWidget"
      @close="closeWizard"
    />

    <DevInspector
      :open="devInspectorOpen"
      @close="devInspectorOpen = false"
    />

    <SettingsModal
      :open="settingsOpen"
      @close="settingsOpen = false"
    />
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dev-btn {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: monospace;
  letter-spacing: 0.05em;
}

.dev-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-min, 48px);
  min-height: var(--touch-min, 48px);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.header-icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.edit-btn {
  min-width: var(--touch-min, 48px);
  min-height: var(--touch-min, 48px);
  padding: 4px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.edit-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.edit-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.status-dot {
  width: 12px;
  height: 12px;
  margin-left: 8px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 6px 2px var(--danger);
  transition: background 0.3s, box-shadow 0.3s;
  flex-shrink: 0;
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 6px 2px var(--success);
}

.status-dot.reconnecting {
  background: #ffb74d;
  box-shadow: 0 0 6px 2px #ffb74d;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 48px 0;
  font-size: 1.1rem;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--grid-gap);
  min-height: 0;
}
</style>
