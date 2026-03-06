<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { DashboardWidget, WidgetTheme } from "@homecontrol/shared";
import { getEffectiveColSpan, getEffectiveRowSpan } from "../../utils/widgetSize";
import { useDashboardStore } from "../../stores/dashboard";
import { useGridDrag } from "../../composables/useGridDrag";
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
import ContainerWidget from "./widgets/ContainerWidget.vue";
import TextWidget from "./widgets/TextWidget.vue";
import EnumWidget from "./widgets/EnumWidget.vue";
import DashboardSwitchWidget from "./widgets/DashboardSwitchWidget.vue";
import BarChartWidget from "./widgets/BarChartWidget.vue";
import PieChartWidget from "./widgets/PieChartWidget.vue";
import MultiLineChartWidget from "./widgets/MultiLineChartWidget.vue";
import CameraWidget from "./widgets/CameraWidget.vue";

defineProps<{
  widgets: DashboardWidget[];
}>();

const emit = defineEmits<{
  editWidget: [widgetId: string];
  placed: [];
}>();

const dashboardStore = useDashboardStore();
const gridRef = ref<HTMLElement | null>(null);

const gridColumns = computed(() => {
  const configured = dashboardStore.grid.columns;
  const maxUsed = dashboardStore.widgets.reduce((max, w) => {
    return Math.max(max, w.position.col + getEffectiveColSpan(w) - 1);
  }, 0);
  return Math.max(configured, maxUsed);
});
const gridRows = computed(() => {
  const configured = dashboardStore.grid.rows;
  const maxUsed = dashboardStore.widgets.reduce((max, w) => {
    return Math.max(max, w.position.row + getEffectiveRowSpan(w) - 1);
  }, 0);
  return Math.max(configured, maxUsed);
});

const gridDynStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridColumns.value}, 1fr)`,
  gridTemplateRows: `repeat(${gridRows.value}, 1fr)`,
}));

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
  gridColumns,
  gridRows,
  onMove: (id, col, row) => dashboardStore.moveWidget(id, col, row),
  onResize: (id, colSpan, rowSpan) => dashboardStore.resizeWidget(id, colSpan, rowSpan),
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
  const style: Record<string, string> = {
    gridColumn: `${widget.position.col} / span ${colSpan}`,
    gridRow: `${widget.position.row} / span ${rowSpan}`,
    ...themeStyle(widget.theme),
  };
  if (widget.backgroundImage?.url) {
    style["--widget-bg-image"] = `url(${widget.backgroundImage.url})`;
    style["--widget-bg-overlay"] = `rgba(0, 0, 0, ${(widget.backgroundImage.overlayOpacity ?? 40) / 100})`;
    style["--widget-bg-blur"] = `${widget.backgroundImage.blur ?? 0}px`;
  }
  return style;
}

function hasWidgetBg(widget: DashboardWidget): boolean {
  return !!widget.backgroundImage?.url;
}

function ghostStyle() {
  if (!activeWidgetId.value) return { display: "none" };
  const widget = dashboardStore.widgets.find((w) => w.id === activeWidgetId.value);
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
  if (!dashboardStore.editMode || !gridRef.value) return;
  startDrag(event, widget, gridRef.value);
}

function onResizeColPointerDown(event: PointerEvent, widget: DashboardWidget) {
  if (!dashboardStore.editMode || !gridRef.value) return;
  startResize(event, widget, gridRef.value, "col");
}

function onResizeRowPointerDown(event: PointerEvent, widget: DashboardWidget) {
  if (!dashboardStore.editMode || !gridRef.value) return;
  startResize(event, widget, gridRef.value, "row");
}

// ─── Placement mode ───
const placing = computed(() => !!dashboardStore.pendingWidget);
const hoverCol = ref(0);
const hoverRow = ref(0);

const pendingColSpan = computed(() => {
  if (!dashboardStore.pendingWidget) return 1;
  return getEffectiveColSpan(dashboardStore.pendingWidget);
});
const pendingRowSpan = computed(() => {
  if (!dashboardStore.pendingWidget) return 1;
  return getEffectiveRowSpan(dashboardStore.pendingWidget);
});

const placementValid = computed(() => {
  if (!placing.value || hoverCol.value < 1 || hoverRow.value < 1) return false;
  return dashboardStore.canPlace(hoverCol.value, hoverRow.value, pendingColSpan.value, pendingRowSpan.value);
});

const occupiedCells = computed(() => {
  if (!placing.value) return new Set<string>();
  return dashboardStore.getOccupiedCells();
});

function cellToGrid(clientX: number, clientY: number) {
  if (!gridRef.value) return { col: 0, row: 0 };
  const rect = gridRef.value.getBoundingClientRect();
  const style = getComputedStyle(gridRef.value);
  const gap = parseFloat(style.gap) || 12;
  const cols = gridColumns.value;
  const rows = gridRows.value;
  const cellW = (rect.width - gap * (cols - 1)) / cols;
  const cellH = (rect.height - gap * (rows - 1)) / rows;

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // Account for gap: each cell occupies cellW + gap (except the last)
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

async function onPlacementClick(event: PointerEvent) {
  if (!placing.value) return;
  const { col, row } = cellToGrid(event.clientX, event.clientY);
  if (!dashboardStore.canPlace(col, row, pendingColSpan.value, pendingRowSpan.value)) return;
  await dashboardStore.placePendingWidget(col, row);
  hoverCol.value = 0;
  hoverRow.value = 0;
  emit("placed");
}

function onPlacementKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && placing.value) {
    dashboardStore.cancelPending();
    hoverCol.value = 0;
    hoverRow.value = 0;
  }
}

onMounted(() => {
  document.addEventListener("keydown", onPlacementKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onPlacementKeydown);
});
</script>

<template>
  <!-- Placement banner -->
  <div v-if="placing" class="placement-banner">
    <span>Tap where you want to place the widget</span>
    <button class="placement-cancel" @click="dashboardStore.cancelPending()">Cancel</button>
  </div>

  <div
    ref="gridRef"
    class="dashboard-grid"
    :class="{
      'edit-mode': dashboardStore.editMode,
      'placement-mode': placing,
    }"
    :style="gridDynStyle"
    @pointermove="onPlacementMove"
    @pointerup="onPlacementClick"
  >
    <!-- Grid overlay lines in edit or placement mode -->
    <template v-if="dashboardStore.editMode || placing">
      <div
        v-for="i in gridColumns"
        :key="'col-' + i"
        class="grid-overlay-col"
        :style="{ gridColumn: `${i} / span 1`, gridRow: '1 / -1' }"
      />
    </template>

    <!-- Occupied cell shading in placement mode -->
    <template v-if="placing">
      <div
        v-for="cell in occupiedCells"
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

    <!-- Ghost drop indicator (drag mode) -->
    <div
      v-if="activeWidgetId"
      class="grid-ghost"
      :style="ghostStyle()"
    />

    <!-- Widget cells -->
    <div
      v-for="widget in widgets"
      :key="widget.id"
      :style="gridStyle(widget)"
      class="grid-cell"
      :class="{
        'is-dragging': activeWidgetId === widget.id && !isResizing,
        'is-resizing': activeWidgetId === widget.id && isResizing,
        'edit-active': dashboardStore.editMode,
        'placement-dimmed': placing,
        'has-bg-image': hasWidgetBg(widget),
      }"
    >
      <div class="widget-content" :class="{ 'no-interact': dashboardStore.editMode || placing }">
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
        <ContainerWidget v-else-if="widget.type === 'container'" :widget="widget" />
        <TextWidget v-else-if="widget.type === 'text'" :widget="widget" />
        <DashboardSwitchWidget v-else-if="widget.type === 'dashboard-switch'" :widget="widget" />
        <BarChartWidget v-else-if="widget.type === 'bar-chart'" :widget="widget" />
        <PieChartWidget v-else-if="widget.type === 'pie-chart'" :widget="widget" />
        <MultiLineChartWidget v-else-if="widget.type === 'multi-line-chart'" :widget="widget" />
        <CameraWidget v-else-if="widget.type === 'camera'" :widget="widget" />
      </div>

      <!-- Edit mode: left half = drag, right half = settings -->
      <template v-if="dashboardStore.editMode">
        <div
          class="edit-zone drag-zone"
          @pointerdown="onCellPointerDown($event, widget)"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </div>
        <div
          class="edit-zone settings-zone"
          @pointerdown.stop
          @click="emit('editWidget', widget.id)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div
          class="edit-zone duplicate-zone"
          @pointerdown.stop
          @click="dashboardStore.duplicateWidget(widget.id)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>
      </template>

      <!-- Resize handles -->
      <template v-if="dashboardStore.editMode">
        <!-- Right edge: horizontal resize (col span) -->
        <div
          class="resize-handle resize-handle-col"
          @pointerdown="onResizeColPointerDown($event, widget)"
        />
        <!-- Bottom edge: vertical resize (row span) -->
        <div
          class="resize-handle resize-handle-row"
          @pointerdown="onResizeRowPointerDown($event, widget)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  /* grid-template-columns and grid-template-rows are set dynamically via :style */
  flex: 1;
  min-height: 0;
  gap: var(--grid-gap);
  align-items: stretch;
  position: relative;
}

.dashboard-grid.edit-mode {
  touch-action: none;
  user-select: none;
}

.grid-cell {
  min-width: 0;
  min-height: 0;
  position: relative;
}

.grid-cell.has-bg-image {
  overflow: hidden;
  border-radius: var(--radius);
}

.grid-cell.has-bg-image::before,
.grid-cell.has-bg-image::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--radius);
}

.grid-cell.has-bg-image::before {
  background-image: var(--widget-bg-image);
  background-size: cover;
  background-position: center;
  filter: blur(var(--widget-bg-blur, 0px));
  z-index: 0;
}

.grid-cell.has-bg-image::after {
  background: var(--widget-bg-overlay);
  z-index: 0;
}

.grid-cell.has-bg-image > .widget-content {
  position: relative;
  z-index: 1;
}

.grid-cell.edit-active {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
  border-radius: var(--radius);
}

.grid-cell.is-dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.grid-cell.is-resizing {
  cursor: ew-resize;
}

.widget-content {
  width: 100%;
  height: 100%;
}

.widget-content.no-interact {
  pointer-events: none;
}

/* Edit mode overlay zones */
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

.drag-zone:active {
  cursor: grabbing;
  background: rgba(79, 195, 247, 0.5);
}

.settings-zone {
  right: 0;
  top: 0;
  bottom: 50%;
  width: 50%;
  cursor: pointer;
  border-radius: 0 var(--radius) 0 0;
  background: rgba(255, 183, 77, 0.35);
}

.settings-zone:active {
  background: rgba(255, 183, 77, 0.5);
}

.duplicate-zone {
  right: 0;
  top: 50%;
  bottom: 0;
  width: 50%;
  cursor: pointer;
  border-radius: 0 0 var(--radius) 0;
  background: rgba(129, 199, 132, 0.35);
}

.duplicate-zone:active {
  background: rgba(129, 199, 132, 0.5);
}

/* Grid overlay columns */
.grid-overlay-col {
  border-left: 1px dashed var(--border);
  pointer-events: none;
  z-index: 0;
}

.grid-overlay-col:last-of-type {
  border-right: 1px dashed var(--border);
}

/* Ghost indicator */
.grid-ghost {
  background: var(--accent);
  opacity: 0.15;
  border-radius: var(--radius);
  border: 2px solid var(--accent);
  pointer-events: none;
  z-index: 1;
}

/* Resize handles (shared) */
.resize-handle {
  position: absolute;
  background: var(--accent);
  border-radius: 3px;
  opacity: 0.7;
  z-index: 2;
  touch-action: none;
}

.resize-handle:hover,
.resize-handle:active {
  opacity: 1;
}

/* Right edge: vertical bar for column resize */
.resize-handle-col {
  right: -2px;
  top: 12px;
  bottom: 12px;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle-col:hover,
.resize-handle-col:active {
  width: 8px;
  right: -3px;
}

/* Bottom edge: horizontal bar for row resize */
.resize-handle-row {
  bottom: -2px;
  left: 12px;
  right: 12px;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle-row:hover,
.resize-handle-row:active {
  height: 8px;
  bottom: -3px;
}

/* ─── Placement mode ─── */
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

.placement-cancel:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.dashboard-grid.placement-mode {
  touch-action: none;
  user-select: none;
  cursor: crosshair;
}

.grid-cell.placement-dimmed {
  opacity: 0.35;
  pointer-events: none;
}

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
</style>
