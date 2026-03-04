import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  DashboardConfig,
  DashboardWidget,
  DashboardEntry,
  AppConfig,
  GridConfig,
  WidgetTheme,
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
  const dashboards = ref<DashboardEntry[]>([]);
  const activeDashboardId = ref("");

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
    dashboards.value = data.dashboards;
    activeDashboardId.value = data.activeDashboardId;
    applyCssVars();
  }

  async function updateGrid(columns: number, rows: number) {
    grid.value = { ...grid.value, columns, rows };
    await saveDashboard();
  }

  async function updateAppearance(gap: number, borderRadius: number) {
    grid.value = { ...grid.value, gap, borderRadius };
    applyCssVars();
    await saveDashboard();
  }

  async function fetchDashboard() {
    const res = await fetch("/api/dashboard");
    const data: DashboardConfig = await res.json();
    widgets.value = data.widgets;
    if (data.grid) {
      grid.value = data.grid;
      applyCssVars();
    }
    loaded.value = true;
  }

  async function saveDashboard() {
    await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: widgets.value, grid: grid.value } satisfies DashboardConfig),
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

  async function applyThemeToAll(theme: WidgetTheme) {
    const hasTheme = Object.keys(theme).length > 0;
    function apply(w: DashboardWidget) {
      w.theme = hasTheme ? { ...theme } : undefined;
      if (w.type === "container") {
        for (const child of w.config.widgets) {
          apply(child);
        }
      }
    }
    for (const w of widgets.value) {
      apply(w);
    }
    await saveDashboard();
  }

  async function switchDashboard(id: string) {
    const res = await fetch(`/api/dashboards/switch/${id}`, { method: "POST" });
    const data = await res.json();
    if (data.error) return;
    activeDashboardId.value = data.activeDashboardId;
    widgets.value = data.dashboard.widgets;
    if (data.dashboard.grid) {
      grid.value = data.dashboard.grid;
      applyCssVars();
    }
    editMode.value = false;
    pendingWidget.value = null;
  }

  async function createDashboard(name: string, icon?: string): Promise<DashboardEntry | null> {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon }),
    });
    const entry: DashboardEntry = await res.json();
    dashboards.value.push(entry);
    return entry;
  }

  async function updateDashboardEntry(id: string, updates: { name?: string; icon?: string }) {
    const res = await fetch(`/api/dashboards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated: DashboardEntry = await res.json();
    const idx = dashboards.value.findIndex((d) => d.id === id);
    if (idx !== -1) dashboards.value[idx] = updated;
  }

  async function deleteDashboard(id: string) {
    const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) return;
    dashboards.value = dashboards.value.filter((d) => d.id !== id);
    if (activeDashboardId.value === id) {
      activeDashboardId.value = data.activeDashboardId;
      await fetchDashboard();
    }
  }

  async function moveWidgetToDashboard(widgetId: string, targetDashboardId: string) {
    const res = await fetch("/api/dashboards/move-widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetId, targetDashboardId }),
    });
    const data = await res.json();
    if (data.error) return;
    // Remove from local state
    widgets.value = widgets.value.filter((w) => w.id !== widgetId);
  }

  return {
    widgets,
    loaded,
    editMode,
    grid,
    pendingWidget,
    dashboards,
    activeDashboardId,
    fetchConfig,
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
    applyThemeToAll,
    switchDashboard,
    createDashboard,
    updateDashboardEntry,
    deleteDashboard,
    moveWidgetToDashboard,
  };
});
