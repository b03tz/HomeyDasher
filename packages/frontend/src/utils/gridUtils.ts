import type { DashboardWidget } from "@homecontrol/shared";
import { getEffectiveColSpan, getEffectiveRowSpan } from "./widgetSize";

/** Returns a Set of "col,row" strings for all cells occupied by the given widgets */
export function getOccupiedCells(widgets: DashboardWidget[]): Set<string> {
  const occupied = new Set<string>();
  for (const w of widgets) {
    const colSpan = getEffectiveColSpan(w);
    const rowSpan = getEffectiveRowSpan(w);
    for (let c = w.position.col; c < w.position.col + colSpan; c++) {
      for (let r = w.position.row; r < w.position.row + rowSpan; r++) {
        occupied.add(`${c},${r}`);
      }
    }
  }
  return occupied;
}

/** Check if a widget with given span can be placed at (col, row) without overlapping */
export function canPlace(
  widgets: DashboardWidget[],
  gridCols: number,
  gridRows: number,
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
): boolean {
  if (col < 1 || row < 1) return false;
  if (col + colSpan - 1 > gridCols) return false;
  if (row + rowSpan - 1 > gridRows) return false;
  const occupied = getOccupiedCells(widgets);
  for (let c = col; c < col + colSpan; c++) {
    for (let r = row; r < row + rowSpan; r++) {
      if (occupied.has(`${c},${r}`)) return false;
    }
  }
  return true;
}

/** Returns the next available row after all existing widgets */
export function nextAvailableRow(widgets: DashboardWidget[]): number {
  if (widgets.length === 0) return 1;
  const maxEndRow = Math.max(
    ...widgets.map((w) => w.position.row + getEffectiveRowSpan(w)),
  );
  return maxEndRow;
}
