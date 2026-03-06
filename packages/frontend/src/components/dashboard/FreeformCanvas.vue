<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { DashboardWidget, WidgetTheme } from "@homecontrol/shared";
import { useDashboardStore } from "../../stores/dashboard";
import { useFreeformDrag } from "../../composables/useFreeformDrag";
import { getDefaultFreeformSize } from "../../utils/widgetSize";
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
const canvasRef = ref<HTMLElement | null>(null);

const {
  activeWidgetId,
  isResizing,
  targetX,
  targetY,
  targetWidth,
  targetHeight,
  startDrag,
  startResize,
  getWidgetRect,
} = useFreeformDrag({
  onMove: (id, x, y) => dashboardStore.moveWidgetFreeform(id, x, y),
  onResize: (id, w, h, x, y) => dashboardStore.resizeWidgetFreeform(id, w, h, x, y),
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

function widgetStyle(widget: DashboardWidget) {
  const isActive = activeWidgetId.value === widget.id;
  const defaults = getDefaultFreeformSize(widget);
  const x = isActive ? targetX.value : (widget.position.x ?? 0);
  const y = isActive ? targetY.value : (widget.position.y ?? 0);
  const w = isActive ? targetWidth.value : (widget.position.width ?? defaults.width);
  const h = isActive ? targetHeight.value : (widget.position.height ?? defaults.height);

  const style: Record<string, string> = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
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

// ─── Placement mode ───
const placing = computed(() => !!dashboardStore.pendingWidget);

function onCanvasClick(event: MouseEvent) {
  if (!placing.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left + canvasRef.value.scrollLeft;
  const y = event.clientY - rect.top + canvasRef.value.scrollTop;
  dashboardStore.placePendingWidgetFreeform(x, y);
  emit("placed");
}

function onPlacementKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && placing.value) {
    dashboardStore.cancelPending();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onPlacementKeydown);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onPlacementKeydown);
});

const RESIZE_DIRECTIONS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
</script>

<template>
  <!-- Placement banner -->
  <div v-if="placing" class="placement-banner">
    <span>Click where you want to place the widget</span>
    <button class="placement-cancel" @click="dashboardStore.cancelPending()">Cancel</button>
  </div>

  <div
    ref="canvasRef"
    class="freeform-canvas"
    :class="{
      'edit-mode': dashboardStore.editMode,
      'placement-mode': placing,
    }"
    @click="onCanvasClick"
  >
    <div
      v-for="widget in widgets"
      :key="widget.id"
      :style="widgetStyle(widget)"
      class="ff-cell"
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

      <!-- Edit mode overlay zones -->
      <template v-if="dashboardStore.editMode">
        <div
          class="edit-zone drag-zone"
          @pointerdown="startDrag($event, widget)"
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

        <!-- 8-direction resize handles -->
        <div
          v-for="dir in RESIZE_DIRECTIONS"
          :key="dir"
          :class="`resize-handle rh-${dir}`"
          @pointerdown="startResize($event, widget, dir)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.freeform-canvas {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: auto;
}

.freeform-canvas.edit-mode {
  touch-action: none;
  user-select: none;
}

.freeform-canvas.placement-mode {
  cursor: crosshair;
}

.ff-cell {
  border-radius: var(--radius);
  overflow: hidden;
}

.ff-cell.edit-active {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
}

.ff-cell.is-dragging {
  opacity: 0.6;
  cursor: grabbing;
  z-index: 100;
}

.ff-cell.is-resizing {
  z-index: 100;
}

.ff-cell.placement-dimmed {
  opacity: 0.35;
  pointer-events: none;
}

.widget-content {
  width: 100%;
  height: 100%;
}

.widget-content.no-interact {
  pointer-events: none;
}

/* Widget background image */
.ff-cell.has-bg-image::before,
.ff-cell.has-bg-image::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--radius);
}

.ff-cell.has-bg-image::before {
  background-image: var(--widget-bg-image);
  background-size: cover;
  background-position: center;
  filter: blur(var(--widget-bg-blur, 0px));
  z-index: 0;
}

.ff-cell.has-bg-image::after {
  background: var(--widget-bg-overlay);
  z-index: 0;
}

.ff-cell.has-bg-image > .widget-content {
  position: relative;
  z-index: 1;
}

/* Edit overlay zones */
.edit-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
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

/* Resize handles */
.resize-handle {
  position: absolute;
  z-index: 20;
  touch-action: none;
  background: var(--accent);
  border-radius: 3px;
  opacity: 0.7;
}

.resize-handle:hover,
.resize-handle:active {
  opacity: 1;
}

/* Edge handles */
.rh-n {
  top: -2px; left: 12px; right: 12px; height: 6px;
  cursor: ns-resize;
}
.rh-n:hover, .rh-n:active {
  height: 8px; top: -3px;
}
.rh-s {
  bottom: -2px; left: 12px; right: 12px; height: 6px;
  cursor: ns-resize;
}
.rh-s:hover, .rh-s:active {
  height: 8px; bottom: -3px;
}
.rh-e {
  right: -2px; top: 12px; bottom: 12px; width: 6px;
  cursor: ew-resize;
}
.rh-e:hover, .rh-e:active {
  width: 8px; right: -3px;
}
.rh-w {
  left: -2px; top: 12px; bottom: 12px; width: 6px;
  cursor: ew-resize;
}
.rh-w:hover, .rh-w:active {
  width: 8px; left: -3px;
}

/* Corner handles */
.rh-ne {
  top: -4px; right: -4px; width: 12px; height: 12px;
  cursor: nesw-resize;
  border-radius: 50%;
}
.rh-nw {
  top: -4px; left: -4px; width: 12px; height: 12px;
  cursor: nwse-resize;
  border-radius: 50%;
}
.rh-se {
  bottom: -4px; right: -4px; width: 12px; height: 12px;
  cursor: nwse-resize;
  border-radius: 50%;
}
.rh-sw {
  bottom: -4px; left: -4px; width: 12px; height: 12px;
  cursor: nesw-resize;
  border-radius: 50%;
}

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
</style>
