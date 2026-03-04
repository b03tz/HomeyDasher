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
  if (widget.type === "live-chart") return 6;
  if (widget.type === "number") return getNumberWidgetColSpan(widget.config.size);
  if (widget.type === "knob") return 2;
  if (widget.type === "weather") return 2;
  if (widget.type === "container") return widget.config.gridColumns;
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
  if (widget.type === "live-chart") return 2;
  if (widget.type === "knob") return 2;
  if (widget.type === "weather") return 2;
  if (widget.type === "container") return widget.config.gridRows;
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
