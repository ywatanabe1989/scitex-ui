/**
 * Layout computation — calculates pane sizes to fit container.
 *
 * Extracted from PaneLayoutHandler for file size compliance.
 */

import type { PaneInfo } from "./_types";

const COLLAPSE_WIDTH = 40;

/**
 * Compute all pane sizes to satisfy: sum(panes) + resizers = container.
 *
 * Rules:
 * - Fixed panes keep their fixedSize
 * - Collapsed panes get COLLAPSE_WIDTH (40px)
 * - Pane with no defaultSize = "remaining space" pane
 * - If defaults exceed available space, all resizable panes scale proportionally
 */
export function computeLayout(
  panes: PaneInfo[],
  containerSize: number,
  resizerCount: number,
  resizerWidth: number,
): void {
  const fixedTotal = panes
    .filter((p) => p.fixed)
    .reduce((s, p) => s + p.fixedSize, 0);
  const resizerTotal = resizerCount * resizerWidth;
  const collapsedCount = panes.filter((p) => !p.fixed && p.collapsed).length;
  const collapsedTotal = collapsedCount * COLLAPSE_WIDTH;
  const available = containerSize - fixedTotal - resizerTotal - collapsedTotal;

  const resizable = panes.filter((p) => !p.fixed && !p.collapsed);
  const remainingPane = resizable.find((p) => p.defaultSize === 0);
  const explicitPanes = resizable.filter((p) => p.defaultSize > 0);
  const explicitTotal = explicitPanes.reduce((s, p) => s + p.size, 0);

  if (remainingPane) {
    const remainingSpace = available - explicitTotal;
    if (remainingSpace >= remainingPane.minSize) {
      // Enough space — remaining pane gets the rest
      remainingPane.size = remainingSpace;
    } else {
      // Not enough — give remaining pane a fair virtual default
      // (equal share among all resizable panes), then scale everyone
      const fairShare = available / resizable.length;
      const allTotal = resizable.reduce(
        (s, p) => s + (p.defaultSize || fairShare),
        0,
      );
      if (allTotal > 0) {
        const scale = available / allTotal;
        for (const p of resizable) {
          const base = p.defaultSize || fairShare;
          p.size = Math.max(p.minSize, Math.round(base * scale));
        }
      }
    }
  } else if (resizable.length > 0) {
    const total = resizable.reduce((s, p) => s + p.size, 0);
    if (total > 0) {
      const scale = available / total;
      for (const p of resizable) {
        p.size = Math.max(p.minSize, Math.round(p.size * scale));
      }
    }
  }
}
