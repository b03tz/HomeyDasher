import { ref } from "vue";
import type { DashboardWidget } from "@homecontrol/shared";
import { getDefaultFreeformSize } from "../utils/widgetSize";

export type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface FreeformDragCallbacks {
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number, x: number, y: number) => void;
}

const MIN_SIZE = 50;

export function useFreeformDrag(callbacks: FreeformDragCallbacks) {
  const activeWidgetId = ref<string | null>(null);
  const isResizing = ref(false);
  const targetX = ref(0);
  const targetY = ref(0);
  const targetWidth = ref(0);
  const targetHeight = ref(0);

  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let originW = 0;
  let originH = 0;
  let currentWidget: DashboardWidget | null = null;
  let resizeDir: ResizeDirection | null = null;

  function getWidgetRect(widget: DashboardWidget) {
    const defaults = getDefaultFreeformSize(widget);
    return {
      x: widget.position.x ?? 0,
      y: widget.position.y ?? 0,
      w: widget.position.width ?? defaults.width,
      h: widget.position.height ?? defaults.height,
    };
  }

  function startDrag(event: PointerEvent, widget: DashboardWidget) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    currentWidget = widget;
    activeWidgetId.value = widget.id;
    isResizing.value = false;
    resizeDir = null;

    const rect = getWidgetRect(widget);
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.x;
    originY = rect.y;
    originW = rect.w;
    originH = rect.h;
    targetX.value = originX;
    targetY.value = originY;
    targetWidth.value = originW;
    targetHeight.value = originH;

    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerUp);
  }

  function startResize(event: PointerEvent, widget: DashboardWidget, direction: ResizeDirection) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    currentWidget = widget;
    activeWidgetId.value = widget.id;
    isResizing.value = true;
    resizeDir = direction;

    const rect = getWidgetRect(widget);
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.x;
    originY = rect.y;
    originW = rect.w;
    originH = rect.h;
    targetX.value = originX;
    targetY.value = originY;
    targetWidth.value = originW;
    targetHeight.value = originH;

    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerup", onPointerUp);
    target.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(event: PointerEvent) {
    if (!currentWidget) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!isResizing.value) {
      targetX.value = Math.max(0, originX + dx);
      targetY.value = Math.max(0, originY + dy);
    } else {
      let newX = originX;
      let newY = originY;
      let newW = originW;
      let newH = originH;

      const dir = resizeDir!;

      if (dir.includes("e")) {
        newW = Math.max(MIN_SIZE, originW + dx);
      }
      if (dir.includes("w")) {
        const w = Math.max(MIN_SIZE, originW - dx);
        newX = originX + (originW - w);
        newW = w;
      }
      if (dir.includes("s")) {
        newH = Math.max(MIN_SIZE, originH + dy);
      }
      if (dir.includes("n")) {
        const h = Math.max(MIN_SIZE, originH - dy);
        newY = originY + (originH - h);
        newH = h;
      }

      targetX.value = Math.max(0, newX);
      targetY.value = Math.max(0, newY);
      targetWidth.value = newW;
      targetHeight.value = newH;
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
      callbacks.onResize(
        currentWidget.id,
        targetWidth.value,
        targetHeight.value,
        targetX.value,
        targetY.value
      );
    } else {
      if (targetX.value !== originX || targetY.value !== originY) {
        callbacks.onMove(currentWidget.id, targetX.value, targetY.value);
      }
    }

    activeWidgetId.value = null;
    isResizing.value = false;
    resizeDir = null;
    currentWidget = null;
  }

  return {
    activeWidgetId,
    isResizing,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    startDrag,
    startResize,
    getWidgetRect,
  };
}
