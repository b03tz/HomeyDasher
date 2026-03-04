import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  DashboardConfig,
  DashboardWidget,
  AppConfig,
  GridConfig,
} from "@homecontrol/shared";
import { getEffectiveColSpan, getEffectiveRowSpan } from "../utils/widgetSize";
import {
  getOccupiedCells as _getOccupiedCells,
  canPlace as _canPlace,
  nextAvailableRow as _nextAvailableRow,
} from "../utils/gridUtils";

export const useDashboardStore = defineStore("dashboard", () => {
  const widgets = ref<DashboardWidget[]>([]);
  const loaded = ref(false);
  const editMode = ref(false);
  const grid = ref<GridConfig>({ columns: 12, rows: 12 });
  const pendingWidget = ref<DashboardWidget | null>(null);

  function toggleEditMode() {
    editMode.value = !editMode.value;
  }

  /** Push gap + borderRadius into :root CSS variables so all grids/widgets pick them up */
  function applyCssVars() {
    const root = document.documentElement;
    root.style.setProperty("--grid-gap", `${grid.value.gap ?? 12}px`);
    root.style.setProperty("--radius", `${grid.value.borderRadius ?? 12}px`);
  }

  async function fetchConfig() {
    const res = await fetch("/api/config");
    const data: AppConfig = await res.json();
    grid.value = data.grid;
    applyCssVars();
  }

  async function saveConfig() {
    // Read full config, update grid, write back
    const res = await fetch("/api/config");
    const data: AppConfig = await res.json();
    data.grid = grid.value;
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function updateGrid(columns: number, rows: number) {
    grid.value = { ...grid.value, columns, rows };
    await saveConfig();
  }

  async function updateAppearance(gap: number, borderRadius: number) {
    grid.value = { ...grid.value, gap, borderRadius };
    applyCssVars();
    await saveConfig();
  }

  async function fetchDashboard() {
    const res = await fetch("/api/dashboard");
    const data: DashboardConfig = await res.json();
    widgets.value = data.widgets;
    loaded.value = true;
  }

  async function saveDashboard() {
    await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: widgets.value } satisfies DashboardConfig),
    });
  }

  async function resetWidgetLocations() {
    // Sort by current row then col
    const sorted = [...widgets.value].sort((a, b) => {
      if (a.position.row !== b.position.row) return a.position.row - b.position.row;
      return a.position.col - b.position.col;
    });

    sorted.forEach((widget, i) => {
      widget.position.col = 1;
      widget.position.row = i + 1;

      // Clamp colSpan to grid width
      const effectiveColSpan = getEffectiveColSpan(widget);
      if (effectiveColSpan > grid.value.columns) {
        widget.position.colSpan = grid.value.columns;
      }

      // Clear rowSpan overrides
      delete widget.position.rowSpan;
    });

    widgets.value = sorted;
    await saveDashboard();
  }

  function nextAvailableRow(): number {
    return _nextAvailableRow(widgets.value);
  }

  function getOccupiedCells(): Set<string> {
    return _getOccupiedCells(widgets.value);
  }

  function canPlace(col: number, row: number, colSpan: number, rowSpan: number): boolean {
    return _canPlace(widgets.value, grid.value.columns, grid.value.rows, col, row, colSpan, rowSpan);
  }

  function setPendingWidget(widget: DashboardWidget) {
    pendingWidget.value = widget;
  }

  async function placePendingWidget(col: number, row: number) {
    if (!pendingWidget.value) return;
    pendingWidget.value.position.col = col;
    pendingWidget.value.position.row = row;
    widgets.value.push(pendingWidget.value);
    pendingWidget.value = null;
    await saveDashboard();
  }

  function cancelPending() {
    pendingWidget.value = null;
  }

  function duplicateWidget(id: string) {
    const widget = widgets.value.find((w) => w.id === id);
    if (!widget) return;
    const clone: DashboardWidget = JSON.parse(JSON.stringify(widget));
    clone.id = crypto.randomUUID();
    pendingWidget.value = clone;
  }

  async function addWidget(widget: DashboardWidget) {
    widgets.value.push(widget);
    await saveDashboard();
  }

  async function updateWidget(updated: DashboardWidget) {
    const idx = widgets.value.findIndex((w) => w.id === updated.id);
    if (idx !== -1) {
      widgets.value[idx] = updated;
      await saveDashboard();
    }
  }

  async function removeWidget(id: string) {
    widgets.value = widgets.value.filter((w) => w.id !== id);
    await saveDashboard();
  }

  async function moveWidget(id: string, col: number, row: number) {
    const widget = widgets.value.find((w) => w.id === id);
    if (widget) {
      widget.position.col = col;
      widget.position.row = row;
      await saveDashboard();
    }
  }

  async function resizeWidget(id: string, colSpan: number, rowSpan: number) {
    const widget = widgets.value.find((w) => w.id === id);
    if (widget) {
      widget.position.colSpan = colSpan;
      widget.position.rowSpan = rowSpan;
      await saveDashboard();
    }
  }

  return {
    widgets,
    loaded,
    editMode,
    grid,
    pendingWidget,
    fetchConfig,
    saveConfig,
    updateGrid,
    updateAppearance,
    fetchDashboard,
    saveDashboard,
    nextAvailableRow,
    getOccupiedCells,
    canPlace,
    setPendingWidget,
    placePendingWidget,
    cancelPending,
    duplicateWidget,
    addWidget,
    updateWidget,
    removeWidget,
    moveWidget,
    resizeWidget,
    toggleEditMode,
    resetWidgetLocations,
  };
});
