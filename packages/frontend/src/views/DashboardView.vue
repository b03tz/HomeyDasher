<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSocket } from "../composables/useSocket";
import { useDashboardStore } from "../stores/dashboard";
import type { DashboardWidget } from "@homecontrol/shared";
import DashboardGrid from "../components/dashboard/DashboardGrid.vue";
import FreeformCanvas from "../components/dashboard/FreeformCanvas.vue";
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

/* ── Header hide / show ── */
const headerHidden = ref(false);
const practiceModalOpen = ref(false);
const practicePillTapped = ref(false);

function requestHideHeader() {
  practicePillTapped.value = false;
  practiceModalOpen.value = true;
}

function onPracticePillTap() {
  practicePillTapped.value = true;
  setTimeout(() => {
    practiceModalOpen.value = false;
    headerHidden.value = true;
  }, 600);
}

function showHeader() {
  headerHidden.value = false;
}

function cancelHide() {
  practiceModalOpen.value = false;
}

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

onMounted(async () => {
  await dashboardStore.fetchConfig();
  await dashboardStore.fetchDashboard();
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

const headerTitle = computed(() => {
  const active = dashboardStore.dashboards.find((d) => d.id === dashboardStore.activeDashboardId);
  return active?.name || "HomeControl";
});

function onWidgetPlaced() {
  dashboardStore.editMode = true;
}

const dashboardBgVars = computed(() => {
  const bg = dashboardStore.backgroundImage;
  if (!bg?.url) return {};
  return {
    "--dash-bg-image": `url(${bg.url})`,
    "--dash-bg-overlay": `rgba(0, 0, 0, ${(bg.overlayOpacity ?? 40) / 100})`,
    "--dash-bg-blur": `${bg.blur ?? 0}px`,
  } as Record<string, string>;
});
</script>

<template>
  <div
    class="dashboard"
    :class="{
      'has-background': !!dashboardStore.backgroundImage?.url,
      'freeform-mode': dashboardStore.layoutMode === 'freeform',
    }"
    :style="dashboardBgVars"
  >
    <!-- Pill handle to restore hidden header -->
    <button
      v-if="headerHidden"
      class="header-pill"
      aria-label="Show toolbar"
      @click="showHeader"
    />

    <header class="app-header" :class="{ hidden: headerHidden }">
      <h1>{{ headerTitle }}</h1>
      <div class="header-actions">
        <button
          class="header-icon-btn hide-header-btn"
          aria-label="Hide toolbar"
          @click="requestHideHeader"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
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
          class="header-icon-btn"
          :class="{ active: dashboardStore.editMode }"
          aria-label="Toggle edit mode"
          @click="dashboardStore.toggleEditMode()"
        >
          <!-- Pencil icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
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
        <span class="status-dot" :class="statusClass" :title="statusTitle" />
      </div>
    </header>

    <main class="content">
      <p v-if="!dashboardStore.loaded" class="empty">Loading dashboard...</p>

      <template v-else>
        <FreeformCanvas
          v-if="dashboardStore.layoutMode === 'freeform'"
          :widgets="dashboardStore.widgets"
          @edit-widget="openEditWizard"
          @placed="onWidgetPlaced"
        />
        <DashboardGrid
          v-else
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
      @open-dev-inspector="devInspectorOpen = true"
    />

    <!-- Practice modal for hiding the header -->
    <Teleport to="body">
      <div v-if="practiceModalOpen" class="practice-overlay" @click.self="cancelHide">
        <div class="practice-modal">
          <template v-if="!practicePillTapped">
            <p class="practice-title">Hide the toolbar?</p>
            <p class="practice-text">
              To show it again, tap the small handle at the top of the screen.
            </p>
            <p class="practice-text practice-cta">Try it now! Tap the handle below:</p>
            <div class="practice-pill-area">
              <button class="practice-pill" @click="onPracticePillTap" />
            </div>
            <button class="practice-cancel" @click="cancelHide">Cancel</button>
          </template>
          <template v-else>
            <p class="practice-title practice-success">Got it!</p>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: none;
  margin: 0;
  padding: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.dashboard.freeform-mode {
  max-width: none;
}

.dashboard.has-background::before,
.dashboard.has-background::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.dashboard.has-background::before {
  background-image: var(--dash-bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(var(--dash-bg-blur, 0px));
}

.dashboard.has-background::after {
  background: var(--dash-bg-overlay);
}

.dashboard.has-background > * {
  position: relative;
  z-index: 1;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(79, 195, 247, 0.2);
  background: rgba(8, 12, 20, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 2px 20px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(79, 195, 247, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
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

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-min, 48px);
  min-height: var(--touch-min, 48px);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(15, 25, 45, 0.4);
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s, background 0.2s;
}

.header-icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 12px rgba(79, 195, 247, 0.15);
}

.header-icon-btn.active {
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

/* ── Header hide / show ── */
.app-header {
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.app-header.hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 100%;
}

.hide-header-btn {
  border: none !important;
  min-width: 36px !important;
  min-height: 36px !important;
  padding: 0 !important;
  opacity: 0.5;
}

.hide-header-btn:hover {
  opacity: 1;
}

/* Pill handle */
.dashboard.has-background > .header-pill {
  position: fixed;
  z-index: 1000;
}

.header-pill {
  position: fixed;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 5px;
  border-radius: 3px;
  background: var(--text-secondary);
  opacity: 0.35;
  border: none;
  cursor: pointer;
  z-index: 1000;
  padding: 0;
  transition: opacity 0.2s, width 0.2s;
  /* Enlarge touch target */
  -webkit-tap-highlight-color: transparent;
}

.header-pill::before {
  content: "";
  position: absolute;
  top: -12px;
  left: -12px;
  right: -12px;
  bottom: -12px;
}

.header-pill:hover,
.header-pill:active {
  opacity: 0.7;
  width: 64px;
}

</style>

<style>
/* ── Practice modal (unscoped for Teleport) ── */
.practice-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.practice-modal {
  background: rgba(12, 18, 30, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(79, 195, 247, 0.12);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  padding: 32px;
  max-width: 360px;
  width: 90%;
  text-align: center;
}

.practice-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary, #fff);
}

.practice-text {
  color: var(--text-secondary, #aaa);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 8px;
}

.practice-cta {
  margin-top: 20px;
  font-weight: 600;
  color: var(--accent, #4fc3f7);
}

.practice-pill-area {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.practice-pill {
  width: 48px;
  height: 5px;
  border-radius: 3px;
  background: var(--text-secondary, #aaa);
  opacity: 0.5;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s, transform 0.2s, width 0.2s;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  animation: pill-pulse 1.5s ease-in-out infinite;
}

.practice-pill::before {
  content: "";
  position: absolute;
  top: -16px;
  left: -16px;
  right: -16px;
  bottom: -16px;
}

.practice-pill:hover,
.practice-pill:active {
  opacity: 0.9;
  width: 64px;
}

@keyframes pill-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}

.practice-cancel {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid var(--border, #333);
  background: transparent;
  color: var(--text-secondary, #aaa);
  font-size: 0.9rem;
  cursor: pointer;
}

.practice-cancel:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.practice-success {
  color: var(--success, #66bb6a);
  font-size: 1.5rem;
  margin: 16px 0;
}
</style>
