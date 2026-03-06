import type { DashboardWidget, NumberWidgetSize } from "@homecontrol/shared";

export function getSwitchWidgetColSpan(deviceCount: number): number {
  if (deviceCount <= 1) return 1;
  if (deviceCount <= 3) return 2;
  if (deviceCount === 4) return 3;
  if (deviceCount <= 6) return 4;
  return 6; // 7–8
}

export function getChartWidgetColSpan(): number {
  return 6;
}

export function getChartWidgetRowSpan(): number {
  return 2;
}

export function getNumberWidgetColSpan(size: NumberWidgetSize): number {
  if (size === "small") return 1;
  if (size === "medium") return 2;
  return 3; // large
}

/** Auto-calculated col span based on widget type */
function getAutoColSpan(widget: DashboardWidget): number {
  if (widget.type === "switch") return getSwitchWidgetColSpan(widget.config.devices.length);
  if (widget.type === "chart") return getChartWidgetColSpan();
  if (widget.type === "bar-chart") return 6;
  if (widget.type === "multi-line-chart") return 6;
  if (widget.type === "pie-chart") return 2;
  if (widget.type === "live-chart") return 6;
  if (widget.type === "number") return getNumberWidgetColSpan(widget.config.size);
  if (widget.type === "knob") return 2;
  if (widget.type === "weather") return 2;
  if (widget.type === "container") return widget.config.gridColumns;
  if (widget.type === "dashboard-switch") return 1;
  if (widget.type === "enum") return 2;
  if (widget.type === "text") return 2;
  if (widget.type === "camera") return 4;
  return 2;
}

/** Returns explicit colSpan if set, otherwise auto-calculates from widget type */
export function getEffectiveColSpan(widget: DashboardWidget): number {
  return widget.position.colSpan ?? getAutoColSpan(widget);
}

/** Minimum col span for resize clamping */
export function getMinColSpan(_widget: DashboardWidget): number {
  return 1;
}

/** Maximum col span for resize clamping */
export function getMaxColSpan(widget: DashboardWidget, gridColumns = 12): number {
  return gridColumns + 1 - widget.position.col;
}

/** Auto-calculated row span based on widget type */
function getAutoRowSpan(widget: DashboardWidget): number {
  if (widget.type === "chart") return getChartWidgetRowSpan();
  if (widget.type === "bar-chart") return 2;
  if (widget.type === "multi-line-chart") return 2;
  if (widget.type === "pie-chart") return 2;
  if (widget.type === "live-chart") return 2;
  if (widget.type === "knob") return 2;
  if (widget.type === "weather") return 2;
  if (widget.type === "container") return widget.config.gridRows;
  if (widget.type === "camera") return 3;
  return 1;
}

/** Returns explicit rowSpan if set, otherwise auto-calculates from widget type */
export function getEffectiveRowSpan(widget: DashboardWidget): number {
  return widget.position.rowSpan ?? getAutoRowSpan(widget);
}

/** Minimum row span for resize clamping */
export function getMinRowSpan(_widget: DashboardWidget): number {
  return 1;
}

/** Maximum row span for resize clamping */
export function getMaxRowSpan(widget: DashboardWidget, gridRows = 12): number {
  return gridRows + 1 - widget.position.row;
}

/** Default pixel size for a widget in freeform mode */
export function getDefaultFreeformSize(widget: DashboardWidget): { width: number; height: number } {
  switch (widget.type) {
    case "switch": return { width: 200, height: 100 };
    case "chart": return { width: 400, height: 220 };
    case "bar-chart": return { width: 400, height: 220 };
    case "multi-line-chart": return { width: 400, height: 220 };
    case "pie-chart": return { width: 220, height: 220 };
    case "live-chart": return { width: 400, height: 220 };
    case "number": return { width: 160, height: 100 };
    case "status": return { width: 200, height: 120 };
    case "gauge": return { width: 200, height: 200 };
    case "slider": return { width: 280, height: 80 };
    case "knob": return { width: 200, height: 200 };
    case "button": return { width: 200, height: 120 };
    case "group-status": return { width: 200, height: 120 };
    case "weather": return { width: 220, height: 200 };
    case "clock": return { width: 200, height: 200 };
    case "enum": return { width: 200, height: 120 };
    case "container": return { width: 400, height: 300 };
    case "text": return { width: 200, height: 100 };
    case "dashboard-switch": return { width: 120, height: 100 };
    case "camera": return { width: 400, height: 300 };
    default: return { width: 200, height: 120 };
  }
}
