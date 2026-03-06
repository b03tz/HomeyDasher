<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { DashboardWidget, WidgetTheme } from "@homecontrol/shared";
import { getEffectiveColSpan, getEffectiveRowSpan } from "../../utils/widgetSize";
import { getOccupiedCells } from "../../utils/gridUtils";
import { uuid } from "../../utils/uuid";
import { useGridDrag } from "../../composables/useGridDrag";
import AddWidgetWizard from "./AddWidgetWizard.vue";
import SwitchWidget from "./widgets/SwitchWidget.vue";
import ChartWidget from "./widgets/ChartWidget.vue";
import NumberWidget from "./widgets/NumberWidget.vue";
import StatusWidget from "./widgets/StatusWidget.vue";
import GaugeWidget from "./widgets/GaugeWidget.vue";
import SliderWidget from "./widgets/SliderWidget.vue";
import KnobWidget from "./widgets/KnobWidget.vue";
import ButtonWidget from "./widgets/ButtonWidget.vue";
import GroupStatusWidget from "./widgets/GroupStatusWidget.vue";
import WeatherWidget from "./widgets/WeatherWidget.vue";
import ClockWidget from "./widgets/ClockWidget.vue";
import LiveChartWidget from "./widgets/LiveChartWidget.vue";
import TextWidget from "./widgets/TextWidget.vue";
import EnumWidget from "./widgets/EnumWidget.vue";
import DashboardSwitchWidget from "./widgets/DashboardSwitchWidget.vue";
import BarChartWidget from "./widgets/BarChartWidget.vue";
import PieChartWidget from "./widgets/PieChartWidget.vue";
import MultiLineChartWidget from "./widgets/MultiLineChartWidget.vue";
import CameraWidget from "./widgets/CameraWidget.vue";
import BatteryWidget from "./widgets/BatteryWidget.vue";
import ImageSwitchWidget from "./widgets/ImageSwitchWidget.vue";

const props = defineProps<{
  gridColumns: number;
  gridRows: number;
  widgets: DashboardWidget[];
}>();

const emit = defineEmits<{
  save: [widgets: DashboardWidget[]];
  cancel: [];
}>();

// Local copy of widgets for editing
const localWidgets = ref<DashboardWidget[]>(JSON.parse(JSON.stringify(props.widgets)));

const gridRef = ref<HTMLElement | null>(null);

const gridCols = computed(() => props.gridColumns);
const gridRowCount = computed(() => props.gridRows);

const gridDynStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridCols.value}, 1fr)`,
  gridTemplateRows: `repeat(${gridRowCount.value}, 1fr)`,
}));

// ─── Drag / Resize ───
const {
  activeWidgetId,
  isResizing,
  resizeAxis,
  targetCol,
  targetRow,
  targetColSpan,
  targetRowSpan,
  startDrag,
  startResize,
} = useGridDrag({
  gridColumns: gridCols,
  gridRows: gridRowCount,
  onMove: (id, col, row) => {
    const w = localWidgets.value.find((w) => w.id === id);
    if (w) { w.position.col = col; w.position.row = row; }
  },
  onResize: (id, colSpan, rowSpan) => {
    const w = localWidgets.value.find((w) => w.id === id);
    if (w) { w.position.colSpan = colSpan; w.position.rowSpan = rowSpan; }
  },
});

function themeStyle(theme?: WidgetTheme): Record<string, string> {
  if (!theme) return {};
  const m: Record<string, string> = {};
  if (theme.background) m["--bg-card"] = theme.background;
  if (theme.foreground) m["--text-primary"] = theme.foreground;
  if (theme.secondaryText) m["--text-secondary"] = theme.secondaryText;
  if (theme.borderColor) m["--border"] = theme.borderColor;
  if (theme.accentColor) m["--accent"] = theme.accentColor;
  if (theme.subBackground) m["--bg-secondary"] = theme.subBackground;
  if (theme.sliderFillColor) m["--widget-slider-fill"] = theme.sliderFillColor;
  return m;
}

function gridStyle(widget: DashboardWidget) {
  const colSpan = getEffectiveColSpan(widget);
  const rowSpan = getEffectiveRowSpan(widget);
  return {
    gridColumn: `${widget.position.col} / span ${colSpan}`,
    gridRow: `${widget.position.row} / span ${rowSpan}`,
    ...themeStyle(widget.theme),
  };
}

function ghostStyle() {
  if (!activeWidgetId.value) return { display: "none" };
  const widget = localWidgets.value.find((w) => w.id === activeWidgetId.value);
  if (!widget) return { display: "none" };
  const colSpan = isResizing.value && resizeAxis.value === "col"
    ? targetColSpan.value
    : getEffectiveColSpan(widget);
  const rowSpan = isResizing.value && resizeAxis.value === "row"
    ? targetRowSpan.value
    : getEffectiveRowSpan(widget);
  return {
    gridColumn: `${targetCol.value} / span ${colSpan}`,
    gridRow: `${targetRow.value} / span ${rowSpan}`,
  };
}

function onCellPointerDown(event: PointerEvent, widget: DashboardWidget) {
  if (!gridRef.value) return;
  startDrag(event, widget, gridRef.value);
}

function onResizeColPointerDown(event: PointerEvent, widget: DashboardWidget) {
  if (!gridRef.value) return;
  startResize(event, widget, gridRef.value, "col");
}

function onResizeRowPointerDown(event: PointerEvent, widget: DashboardWidget) {
  if (!gridRef.value) return;
  startResize(event, widget, gridRef.value, "row");
}

// ─── Placement mode ───
const pendingWidget = ref<DashboardWidget | null>(null);
const placing = computed(() => !!pendingWidget.value);
const hoverCol = ref(0);
const hoverRow = ref(0);

const desiredColSpan = computed(() => {
  if (!pendingWidget.value) return 1;
  return getEffectiveColSpan(pendingWidget.value);
});
const desiredRowSpan = computed(() => {
  if (!pendingWidget.value) return 1;
  return getEffectiveRowSpan(pendingWidget.value);
});

/** Clamp desired span to fit at (col, row) considering grid bounds and occupied cells */
function clampSpan(col: number, row: number, wantCols: number, wantRows: number): { colSpan: number; rowSpan: number } | null {
  if (col < 1 || row < 1) return null;
  const maxCols = gridCols.value - col + 1;
  const maxRows = gridRowCount.value - row + 1;
  if (maxCols < 1 || maxRows < 1) return null;
  const occupied = getOccupiedCells(localWidgets.value);
  // The clicked cell itself must be free
  if (occupied.has(`${col},${row}`)) return null;
  // Shrink colSpan/rowSpan to avoid occupied cells and grid edges
  let colSpan = Math.min(wantCols, maxCols);
  let rowSpan = Math.min(wantRows, maxRows);
  for (let c = col; c < col + colSpan; c++) {
    for (let r = row; r < row + rowSpan; r++) {
      if (occupied.has(`${c},${r}`)) {
        // Shrink whichever dimension removes this conflict
        // Try shrinking cols first to the column before the conflict
        if (c > col) colSpan = Math.min(colSpan, c - col);
        else rowSpan = Math.min(rowSpan, r - row);
      }
    }
  }
  if (colSpan < 1 || rowSpan < 1) return null;
  return { colSpan, rowSpan };
}

const clampedSpan = computed(() => {
  if (!placing.value || hoverCol.value < 1 || hoverRow.value < 1) return null;
  return clampSpan(hoverCol.value, hoverRow.value, desiredColSpan.value, desiredRowSpan.value);
});

const pendingColSpan = computed(() => clampedSpan.value?.colSpan ?? desiredColSpan.value);
const pendingRowSpan = computed(() => clampedSpan.value?.rowSpan ?? desiredRowSpan.value);

const placementValid = computed(() => {
  return clampedSpan.value !== null;
});

const occupiedCellSet = computed(() => {
  if (!placing.value) return new Set<string>();
  return getOccupiedCells(localWidgets.value);
});

function cellToGrid(clientX: number, clientY: number) {
  if (!gridRef.value) return { col: 0, row: 0 };
  const rect = gridRef.value.getBoundingClientRect();
  const style = getComputedStyle(gridRef.value);
  const gap = parseFloat(style.gap) || 8;
  const cols = gridCols.value;
  const rows = gridRowCount.value;
  const cellW = (rect.width - gap * (cols - 1)) / cols;
  const cellH = (rect.height - gap * (rows - 1)) / rows;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = Math.max(1, Math.min(cols, Math.floor(x / (cellW + gap)) + 1));
  const row = Math.max(1, Math.min(rows, Math.floor(y / (cellH + gap)) + 1));
  return { col, row };
}

function onPlacementMove(event: PointerEvent) {
  if (!placing.value) return;
  const { col, row } = cellToGrid(event.clientX, event.clientY);
  hoverCol.value = col;
  hoverRow.value = row;
}

function onPlacementClick(event: PointerEvent) {
  if (!placing.value || !pendingWidget.value) return;
  const { col, row } = cellToGrid(event.clientX, event.clientY);
  const clamped = clampSpan(col, row, desiredColSpan.value, desiredRowSpan.value);
  if (!clamped) return;
  pendingWidget.value.position.col = col;
  pendingWidget.value.position.row = row;
  // Set explicit span overrides if clamped smaller than default
  if (clamped.colSpan !== desiredColSpan.value) {
    pendingWidget.value.position.colSpan = clamped.colSpan;
  }
  if (clamped.rowSpan !== desiredRowSpan.value) {
    pendingWidget.value.position.rowSpan = clamped.rowSpan;
  }
  localWidgets.value.push(pendingWidget.value);
  pendingWidget.value = null;
  hoverCol.value = 0;
  hoverRow.value = 0;
}

function cancelPlacement() {
  pendingWidget.value = null;
  hoverCol.value = 0;
  hoverRow.value = 0;
}

// ─── Add / Edit child widgets ───
const wizardOpen = ref(false);
const editingChild = ref<DashboardWidget | null>(null);

function openAddWizard() {
  editingChild.value = null;
  wizardOpen.value = true;
}

function openEditWizard(widgetId: string) {
  const w = localWidgets.value.find((w) => w.id === widgetId);
  if (w) {
    editingChild.value = w;
    wizardOpen.value = true;
  }
}

function onChildWizardSave(widget: DashboardWidget) {
  if (editingChild.value) {
    // Update existing
    const idx = localWidgets.value.findIndex((w) => w.id === widget.id);
    if (idx !== -1) localWidgets.value[idx] = widget;
  } else {
    // New widget — enter placement mode
    pendingWidget.value = widget;
  }
  wizardOpen.value = false;
  editingChild.value = null;
}

function onChildWizardClose() {
  wizardOpen.value = false;
  editingChild.value = null;
}

function duplicateChildWidget(widget: DashboardWidget) {
  const clone: DashboardWidget = JSON.parse(JSON.stringify(widget));
  clone.id = uuid();
  pendingWidget.value = clone;
}

function onChildWizardDelete(widgetId: string) {
  localWidgets.value = localWidgets.value.filter((w) => w.id !== widgetId);
  wizardOpen.value = false;
  editingChild.value = null;
}

// ─── Keyboard ───
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (placing.value) {
      cancelPlacement();
    } else if (wizardOpen.value) {
      onChildWizardClose();
    } else {
      emit("cancel");
    }
  }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));

function done() {
  emit("save", JSON.parse(JSON.stringify(localWidgets.value)));
}
</script>

<template>
  <Teleport to="body">
    <div class="container-editor-overlay">
      <div class="container-editor">
        <!-- Header -->
        <div class="editor-header">
          <h2>Edit Container</h2>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="openAddWizard">+ Add</button>
            <button class="btn btn-primary" @click="done">Done</button>
          </div>
        </div>

        <!-- Placement banner -->
        <div v-if="placing" class="placement-banner">
          <span>Tap where you want to place the widget</span>
          <button class="placement-cancel" @click="cancelPlacement">Cancel</button>
        </div>

        <!-- Grid -->
        <div
          ref="gridRef"
          class="editor-grid"
          :class="{ 'placement-mode': placing }"
          :style="gridDynStyle"
          @pointermove="onPlacementMove"
          @pointerup="onPlacementClick"
        >
          <!-- Grid overlay columns -->
          <div
            v-for="i in gridCols"
            :key="'col-' + i"
            class="grid-overlay-col"
            :style="{ gridColumn: `${i} / span 1`, gridRow: '1 / -1' }"
          />

          <!-- Occupied cell shading in placement mode -->
          <template v-if="placing">
            <div
              v-for="cell in occupiedCellSet"
              :key="'occ-' + cell"
              class="grid-occupied"
              :style="{
                gridColumn: `${cell.split(',')[0]} / span 1`,
                gridRow: `${cell.split(',')[1]} / span 1`,
              }"
            />
          </template>

          <!-- Placement ghost preview -->
          <div
            v-if="placing && hoverCol > 0 && hoverRow > 0"
            class="grid-ghost placement-ghost"
            :class="{ invalid: !placementValid }"
            :style="{
              gridColumn: `${hoverCol} / span ${pendingColSpan}`,
              gridRow: `${hoverRow} / span ${pendingRowSpan}`,
            }"
          />

          <!-- Drag ghost -->
          <div
            v-if="activeWidgetId"
            class="grid-ghost"
            :style="ghostStyle()"
          />

          <!-- Widget cells -->
          <div
            v-for="widget in localWidgets"
            :key="widget.id"
            :style="gridStyle(widget)"
            class="grid-cell edit-active"
            :class="{
              'is-dragging': activeWidgetId === widget.id && !isResizing,
              'is-resizing': activeWidgetId === widget.id && isResizing,
              'placement-dimmed': placing,
            }"
          >
            <div class="widget-content no-interact">
              <SwitchWidget v-if="widget.type === 'switch'" :widget="widget" />
              <ChartWidget v-else-if="widget.type === 'chart'" :widget="widget" />
              <NumberWidget v-else-if="widget.type === 'number'" :widget="widget" />
              <StatusWidget v-else-if="widget.type === 'status'" :widget="widget" />
              <GaugeWidget v-else-if="widget.type === 'gauge'" :widget="widget" />
              <SliderWidget v-else-if="widget.type === 'slider'" :widget="widget" />
              <KnobWidget v-else-if="widget.type === 'knob'" :widget="widget" />
              <ButtonWidget v-else-if="widget.type === 'button'" :widget="widget" />
              <GroupStatusWidget v-else-if="widget.type === 'group-status'" :widget="widget" />
              <WeatherWidget v-else-if="widget.type === 'weather'" :widget="widget" />
              <ClockWidget v-else-if="widget.type === 'clock'" :widget="widget" />
              <LiveChartWidget v-else-if="widget.type === 'live-chart'" :widget="widget" />
              <EnumWidget v-else-if="widget.type === 'enum'" :widget="widget" />
              <TextWidget v-else-if="widget.type === 'text'" :widget="widget" />
              <DashboardSwitchWidget v-else-if="widget.type === 'dashboard-switch'" :widget="widget" />
              <BarChartWidget v-else-if="widget.type === 'bar-chart'" :widget="widget" />
              <PieChartWidget v-else-if="widget.type === 'pie-chart'" :widget="widget" />
              <MultiLineChartWidget v-else-if="widget.type === 'multi-line-chart'" :widget="widget" />
              <CameraWidget v-else-if="widget.type === 'camera'" :widget="widget" />
              <BatteryWidget v-else-if="widget.type === 'battery'" :widget="widget" />
              <ImageSwitchWidget v-else-if="widget.type === 'image-switch'" :widget="widget" />
            </div>

            <!-- Drag / settings zones -->
            <div
              class="edit-zone drag-zone"
              @pointerdown="onCellPointerDown($event, widget)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </div>
            <div
              class="edit-zone settings-zone"
              @pointerdown.stop
              @click="openEditWizard(widget.id)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div
              class="edit-zone duplicate-zone"
              @pointerdown.stop
              @click="duplicateChildWidget(widget)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>

            <!-- Resize handles -->
            <div
              class="resize-handle resize-handle-col"
              @pointerdown="onResizeColPointerDown($event, widget)"
            />
            <div
              class="resize-handle resize-handle-row"
              @pointerdown="onResizeRowPointerDown($event, widget)"
            />
          </div>

          <!-- Empty state -->
          <div v-if="localWidgets.length === 0 && !placing" class="empty-state">
            Tap "+ Add" to add widgets to this container
          </div>
        </div>
      </div>

      <!-- Child widget wizard -->
      <AddWidgetWizard
        :open="wizardOpen"
        :edit-widget="editingChild"
        :exclude-types="['container']"
        :external-mode="true"
        :z-index="3000"
        @save-widget="onChildWizardSave"
        @delete-widget="onChildWizardDelete"
        @close="onChildWizardClose"
      />
    </div>
  </Teleport>
</template>

<style scoped>
.container-editor-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.container-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  min-height: 0;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.editor-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: #000;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.editor-grid {
  flex: 1;
  display: grid;
  gap: var(--grid-gap);
  align-items: stretch;
  position: relative;
  touch-action: none;
  user-select: none;
  min-height: 0;
}

.editor-grid.placement-mode {
  cursor: crosshair;
}

/* Grid overlay */
.grid-overlay-col {
  border-left: 1px dashed var(--border);
  pointer-events: none;
  z-index: 0;
}
.grid-overlay-col:last-of-type {
  border-right: 1px dashed var(--border);
}

.grid-cell {
  min-width: 0;
  min-height: 0;
  position: relative;
}

.grid-cell.edit-active {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
  border-radius: var(--radius);
}

.grid-cell.is-dragging { opacity: 0.4; cursor: grabbing; }
.grid-cell.is-resizing { cursor: ew-resize; }
.grid-cell.placement-dimmed { opacity: 0.35; pointer-events: none; }

.widget-content { width: 100%; height: 100%; }
.widget-content.no-interact { pointer-events: none; }

/* Edit zones */
.edit-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.edit-zone svg {
  color: #fff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.drag-zone {
  left: 0;
  width: 50%;
  cursor: grab;
  border-radius: var(--radius) 0 0 var(--radius);
  background: rgba(79, 195, 247, 0.35);
}
.drag-zone:active { cursor: grabbing; background: rgba(79, 195, 247, 0.5); }

.settings-zone {
  right: 0;
  top: 0;
  bottom: 50%;
  width: 50%;
  cursor: pointer;
  border-radius: 0 var(--radius) 0 0;
  background: rgba(255, 183, 77, 0.35);
}
.settings-zone:active { background: rgba(255, 183, 77, 0.5); }

.duplicate-zone {
  right: 0;
  top: 50%;
  bottom: 0;
  width: 50%;
  cursor: pointer;
  border-radius: 0 0 var(--radius) 0;
  background: rgba(129, 199, 132, 0.35);
}
.duplicate-zone:active { background: rgba(129, 199, 132, 0.5); }

/* Ghost */
.grid-ghost {
  background: var(--accent);
  opacity: 0.15;
  border-radius: var(--radius);
  border: 2px solid var(--accent);
  pointer-events: none;
  z-index: 1;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  background: var(--accent);
  border-radius: 3px;
  opacity: 0.7;
  z-index: 2;
  touch-action: none;
}
.resize-handle:hover, .resize-handle:active { opacity: 1; }

.resize-handle-col {
  right: -2px; top: 12px; bottom: 12px; width: 6px; cursor: ew-resize;
}
.resize-handle-col:hover, .resize-handle-col:active { width: 8px; right: -3px; }

.resize-handle-row {
  bottom: -2px; left: 12px; right: 12px; height: 6px; cursor: ns-resize;
}
.resize-handle-row:hover, .resize-handle-row:active { height: 8px; bottom: -3px; }

/* Placement */
.placement-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--bg-card);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  flex-shrink: 0;
}

.placement-cancel {
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
}
.placement-cancel:hover { border-color: var(--danger); color: var(--danger); }

.grid-occupied {
  background: var(--text-secondary);
  opacity: 0.08;
  border-radius: 4px;
  pointer-events: none;
  z-index: 0;
}

.placement-ghost {
  background: var(--accent);
  opacity: 0.25;
  border: 2px solid var(--accent);
  border-radius: var(--radius);
  pointer-events: none;
  z-index: 2;
  transition: grid-column 0.08s, grid-row 0.08s;
}
.placement-ghost.invalid {
  background: var(--danger);
  border-color: var(--danger);
  opacity: 0.2;
}

.empty-state {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  pointer-events: none;
}
</style>
