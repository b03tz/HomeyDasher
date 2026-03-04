import { ref, type Ref } from "vue";
import type { DashboardWidget } from "@homecontrol/shared";
import {
  getEffectiveColSpan,
  getEffectiveRowSpan,
  getMinColSpan,
  getMaxColSpan,
  getMinRowSpan,
  getMaxRowSpan,
} from "../utils/widgetSize";

type ResizeAxis = "col" | "row";

export interface GridDragState {
  activeWidgetId: Ref<string | null>;
  isResizing: Ref<boolean>;
  resizeAxis: Ref<ResizeAxis | null>;
  targetCol: Ref<number>;
  targetRow: Ref<number>;
  targetColSpan: Ref<number>;
  targetRowSpan: Ref<number>;
}

export interface GridDragCallbacks {
  onMove: (id: string, col: number, row: number) => void;
  onResize: (id: string, colSpan: number, rowSpan: number) => void;
}

export interface GridDragOptions extends GridDragCallbacks {
  gridColumns: Ref<number>;
  gridRows: Ref<number>;
}

export function useGridDrag(options: GridDragOptions) {
  const { gridColumns, gridRows } = options;

  const activeWidgetId = ref<string | null>(null);
  const isResizing = ref(false);
  const resizeAxis = ref<ResizeAxis | null>(null);
  const targetCol = ref(1);
  const targetRow = ref(1);
  const targetColSpan = ref(1);
  const targetRowSpan = ref(1);

  // Measured at drag start
  let cellWidth = 0;
  let cellHeight = 0;
  let startX = 0;
  let startY = 0;
  let originCol = 0;
  let originRow = 0;
  let originColSpan = 0;
  let originRowSpan = 0;
  let currentWidget: DashboardWidget | null = null;

  function measureGrid(gridEl: HTMLElement) {
    const gridRect = gridEl.getBoundingClientRect();
    const style = getComputedStyle(gridEl);
    const gap = parseFloat(style.gap) || 12;
    const cols = gridColumns.value;
    const rows = gridRows.value;
    cellWidth = (gridRect.width - gap * (cols - 1)) / cols;
    cellHeight = (gridRect.height - gap * (rows - 1)) / rows;
  }

  function initCommon(event: PointerEvent, widget: DashboardWidget, gridEl: HTMLElement) {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    measureGrid(gridEl);
    currentWidget = widget;
    activeWidgetId.value = widget.id;
    startX = event.clientX;
    startY = event.clientY;
    originCol = widget.position.col;
    originRow = widget.position.row;
    originColSpan = getEffectiveColSpan(widget);
    originRowSpan = getEffectiveRowSpan(widget);
    targetCol.value = originCol;
    targetRow.value = originRow;
    targetColSpan.value = originColSpan;
    targetRowSpan.value = originRowSpan;
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerUp);
  }

  function startDrag(event: PointerEvent, widget: DashboardWidget, gridEl: HTMLElement) {
    event.preventDefault();
    isResizing.value = false;
    resizeAxis.value = null;
    initCommon(event, widget, gridEl);
  }

  function startResize(event: PointerEvent, widget: DashboardWidget, gridEl: HTMLElement, axis: ResizeAxis) {
    event.preventDefault();
    event.stopPropagation();
    isResizing.value = true;
    resizeAxis.value = axis;
    initCommon(event, widget, gridEl);
  }

  function onPointerMove(event: PointerEvent) {
    if (!currentWidget) return;
    const gap = 12;
    const cols = gridColumns.value;
    const rows = gridRows.value;

    if (isResizing.value) {
      if (resizeAxis.value === "col") {
        const dx = event.clientX - startX;
        const colDelta = Math.round(dx / (cellWidth + gap));
        targetColSpan.value = Math.max(
          getMinColSpan(currentWidget),
          Math.min(getMaxColSpan(currentWidget, cols), originColSpan + colDelta)
        );
      } else {
        const dy = event.clientY - startY;
        const rowDelta = Math.round(dy / (cellHeight + gap));
        targetRowSpan.value = Math.max(
          getMinRowSpan(currentWidget),
          Math.min(getMaxRowSpan(currentWidget, rows), originRowSpan + rowDelta)
        );
      }
    } else {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const colDelta = Math.round(dx / (cellWidth + gap));
      const rowDelta = Math.round(dy / (cellHeight + gap));
      targetCol.value = Math.max(1, Math.min(cols + 1 - originColSpan, originCol + colDelta));
      targetRow.value = Math.max(1, Math.min(rows + 1 - originRowSpan, originRow + rowDelta));
    }
  }

  function onPointerUp(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    target.releasePointerCapture(event.pointerId);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
    target.removeEventListener("pointercancel", onPointerUp);

    if (!currentWidget) return;

    if (isResizing.value) {
      const colSpanChanged = targetColSpan.value !== originColSpan;
      const rowSpanChanged = targetRowSpan.value !== originRowSpan;
      if (colSpanChanged || rowSpanChanged) {
        options.onResize(currentWidget.id, targetColSpan.value, targetRowSpan.value);
      }
    } else {
      if (targetCol.value !== originCol || targetRow.value !== originRow) {
        options.onMove(currentWidget.id, targetCol.value, targetRow.value);
      }
    }

    activeWidgetId.value = null;
    isResizing.value = false;
    resizeAxis.value = null;
    currentWidget = null;
  }

  return {
    activeWidgetId,
    isResizing,
    resizeAxis,
    targetCol,
    targetRow,
    targetColSpan,
    targetRowSpan,
    startDrag,
    startResize,
  };
}
