/**
 * Drag state machine for BaseResizer.
 *
 * Handles mousedown → mousemove → mouseup with:
 * - Smart collapse: panel collapses instantly during drag (not on mouseUp)
 * - Cascade propagation: remaining delta transfers to adjacent panel
 * - Magnetic snap: resizer is physically pulled toward snap points
 * - Four resize modes: only-second, only-first, both, neither
 */

import type { BaseResizer } from "./_base";
import type { PropagationTarget } from "./types";
import { saveCollapsed, saveSize } from "./_state";
import { updateToggleIcon } from "./_toggle";
import { magneticSnap, percentSnapPoints } from "./_snap";

/** Attach drag handling to a BaseResizer instance */
export function attachDragHandler(resizer: BaseResizer): void {
  const el = resizer.getResizerEl();
  el.addEventListener("mousedown", (e) => onMouseDown(resizer, e));
}

function onMouseDown(r: BaseResizer, e: MouseEvent): void {
  if (r.isClickOnToggle(e)) return;

  e.preventDefault();
  r.startDrag(e);
  collapsedWhich = null;
  collapseMousePos = 0;
  const [sf, ss] = r.getStartSizes();
  console.log(
    `[Resizer:drag] mousedown on ${r.getStorageKey()} — firstSize=${sf}, secondSize=${ss}, firstCan=${r.getFirstCanCollapse()}, secondCan=${r.getSecondCanCollapse()}, threshold=${r.getThresholdPx()}, isInApp=${r.getIsInApp()}`,
  );

  document.body.style.cursor = r.getCursorPublic();
  document.body.style.userSelect = "none";
  r.getResizerEl().classList.add("active");

  // Disable transitions during drag
  r.getFirstPanel().style.transition = "none";
  r.getSecondPanel().style.transition = "none";
  if (!r.getIsInApp()) {
    document
      .querySelectorAll<HTMLElement>(".stx-shell-sidebar")
      .forEach((el) => (el.style.transition = "none"));
  }

  r.fireOnDragStart();

  const onMove = (e: MouseEvent) => handleMouseMove(r, e);
  const cleanup = () => handleMouseUp(r, onMove, cleanup);

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", cleanup);
  // Also handle mouse leaving the window entirely (fixes "domino stuck" on mouse-off)
  document.addEventListener("mouseleave", cleanup);
}

/** Track the last raw (un-snapped) mouse position for mouseUp finalization */
let lastRawMousePos = 0;

/** Track which panel was collapsed and the mouse position at collapse */
let collapsedWhich: "first" | "second" | null = null;
let collapseMousePos = 0;

function handleMouseMove(r: BaseResizer, e: MouseEvent): void {
  if (!r.isDraggingNow()) return;

  const mousePos = r.getMousePosPublic(e);
  lastRawMousePos = mousePos;

  // If primary collapsed, check if mouse crossed back past collapse point
  if (r.isPrimaryCollapsed()) {
    const threshold = r.getThresholdPx();
    const reverseDelta = mousePos - collapseMousePos;

    // Immediate re-expand: mouse crossed threshold distance from collapse
    const shouldReExpand =
      (collapsedWhich === "first" && reverseDelta > threshold) ||
      (collapsedWhich === "second" && reverseDelta < -threshold);

    if (shouldReExpand && collapsedWhich) {
      console.log(
        `[Resizer:drag] ${r.getStorageKey()} RE-EXPAND ${collapsedWhich} (reverseDelta=${reverseDelta.toFixed(0)})`,
      );
      r.clearPropagate();
      const savedCollapsePos = collapseMousePos;
      const savedWhich = collapsedWhich;
      r.reExpandDuringDrag(collapsedWhich);
      // Reset to collapse point: expansion grows from threshold at collapse pos
      r.resetDragFromCollapse(savedCollapsePos, savedWhich);
      collapsedWhich = null;
      collapseMousePos = 0;
      // Fall through to applyResize — works like dragging an open pane
    }

    // If still collapsed
    if (r.isPrimaryCollapsed()) {
      if (r.getPropagate()) {
        applyPropagation(r, e);
        return;
      }
      return;
    }
  }

  const delta = mousePos - r.getStartPos();
  applyResize(r, delta, e);
}

function handleMouseUp(
  r: BaseResizer,
  onMove: (e: MouseEvent) => void,
  cleanup: () => void,
): void {
  if (!r.isDraggingNow()) return;

  // Apply final position using raw (un-snapped) mouse pos to respect
  // the actual endpoint — fixes high-speed drag not reaching destination
  if (!r.isPrimaryCollapsed()) {
    const finalDelta = lastRawMousePos - r.getStartPos();
    applyResizeRaw(r, finalDelta);
  }

  r.endDrag();

  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  r.getResizerEl().classList.remove("active");
  r.getResizerEl().classList.remove("snapped");
  r.getFirstPanel().style.transition = "";
  r.getSecondPanel().style.transition = "";
  if (!r.getIsInApp()) {
    document
      .querySelectorAll<HTMLElement>(".stx-shell-sidebar")
      .forEach((el) => (el.style.transition = ""));
  }

  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", cleanup);
  document.removeEventListener("mouseleave", cleanup);
  console.log(
    `[Resizer:drag] mouseup on ${r.getStorageKey()} — first.collapsed=${r.getFirstPanel().classList.contains("collapsed")}, second.collapsed=${r.getSecondPanel().classList.contains("collapsed")}, firstSize=${r.getSizePublic(r.getFirstPanel())}, secondSize=${r.getSizePublic(r.getSecondPanel())}`,
  );

  // Save propagation target state
  const prop = r.getPropagate();
  if (prop) {
    const propSize = r.getSizePublic(prop.panel);
    if (propSize > prop.thresholdPx + 10) {
      saveSize(prop.storageKey, propSize);
    }
    r.clearPropagate();
  }

  r.fireOnDragEnd();
  r.saveStatePublic();
}

/** Compute snap points for the current drag context */
function getSnapPoints(r: BaseResizer): number[] {
  const container = r.getFirstPanel().parentElement;
  if (!container) return r.getSnapPoints();
  const containerSize = r.getSizePublic(container);
  const pctSnaps = percentSnapPoints(containerSize);
  const explicit = r.getSnapPoints();
  return explicit.length > 0 ? [...pctSnaps, ...explicit] : pctSnaps;
}

/** Apply magnetic snap to a raw size value and update visual feedback */
function snap(r: BaseResizer, raw: number, snaps: number[]): number {
  const result = magneticSnap(raw, snaps);
  const el = r.getResizerEl();
  if (result.snapped) {
    el.classList.add("snapped");
  } else {
    el.classList.remove("snapped");
  }
  return result.value;
}

/**
 * Apply resize delta to primary panels.
 *
 * No max size — only min (threshold). When the opposite panel hits its
 * threshold, the overflow cascades (domino) to shrink the next sibling.
 *
 * Three modes:
 *   1. Only second can collapse → sized panel = second
 *   2. Only first can collapse  → sized panel = first
 *   3. Both/neither             → seesaw (first grows, second shrinks)
 */
function applyResize(r: BaseResizer, delta: number, e: MouseEvent): void {
  const first = r.getFirstPanel();
  const second = r.getSecondPanel();
  const key = r.getStorageKey();
  const threshold = r.getThresholdPx();
  const [startFirst, startSecond] = r.getStartSizes();
  const firstCan = r.getFirstCanCollapse();
  const secondCan = r.getSecondCanCollapse();
  const snaps = getSnapPoints(r);

  if (secondCan && !firstCan) {
    // Sized panel = second. No max — domino handles overflow.
    const rawSize = snap(r, startSecond - delta, snaps);

    // Collapse check
    if (rawSize < threshold) {
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("second");
      collapsedWhich = "second";
      collapseMousePos = r.getMousePosPublic(e);
      tryStartCascade(r, second, e);
      return;
    }

    if (second.classList.contains("collapsed")) {
      second.classList.remove("collapsed");
      saveCollapsed(key + "-second", false);
    }

    // Compute how much the opposite panel (first) needs to shrink
    const oppositeNeeded = rawSize - startSecond; // negative = second shrank, positive = second grew
    const oppositeNewSize = startFirst - oppositeNeeded;

    if (oppositeNewSize >= threshold) {
      // Opposite panel can absorb the resize
      r.setSizePublic(second, rawSize);
      second.style.flexShrink = "0";
      second.style.flexGrow = "0";
      r.setSizePublic(first, oppositeNewSize);
      first.style.flexShrink = "0";
      first.style.flexGrow = "0";
    } else {
      // Opposite hit threshold — clamp it, domino the overflow
      const clamped = threshold;
      const actualSecond = startFirst + startSecond - clamped;
      r.setSizePublic(second, actualSecond);
      second.style.flexShrink = "0";
      second.style.flexGrow = "0";
      r.setSizePublic(first, clamped);
      first.style.flexShrink = "0";
      first.style.flexGrow = "0";
      // Domino: push overflow to next sibling
      const overflow = threshold - oppositeNewSize;
      tryExpandCascade(r, first, overflow, e);
    }
  } else if (firstCan && !secondCan) {
    // Sized panel = first. No max — domino handles overflow.
    const rawSize = snap(r, startFirst + delta, snaps);

    // Collapse check
    if (rawSize < threshold) {
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("first");
      collapsedWhich = "first";
      collapseMousePos = r.getMousePosPublic(e);
      tryStartCascade(r, first, e);
      return;
    }

    if (first.classList.contains("collapsed")) {
      first.classList.remove("collapsed");
      saveCollapsed(key + "-first", false);
    }

    // Compute how much the opposite panel (second) needs to shrink
    const oppositeNeeded = rawSize - startFirst;
    const oppositeNewSize = startSecond - oppositeNeeded;

    if (oppositeNewSize >= threshold) {
      r.setSizePublic(first, rawSize);
      first.style.flexShrink = "0";
      first.style.flexGrow = "0";
      r.setSizePublic(second, oppositeNewSize);
      second.style.flexShrink = "0";
      second.style.flexGrow = "0";
    } else {
      // Opposite hit threshold — clamp, domino overflow
      const clamped = threshold;
      const actualFirst = startFirst + startSecond - clamped;
      r.setSizePublic(first, actualFirst);
      first.style.flexShrink = "0";
      first.style.flexGrow = "0";
      r.setSizePublic(second, clamped);
      second.style.flexShrink = "0";
      second.style.flexGrow = "0";
      const overflow = threshold - oppositeNewSize;
      tryExpandCascade(r, second, overflow, e);
    }
  } else {
    // Seesaw: both or neither can collapse
    const newFirst = snap(r, startFirst + delta, snaps);
    let newSecond = startSecond - (newFirst - startFirst);

    if (firstCan && newFirst < threshold) {
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("first");
      collapsedWhich = "first";
      collapseMousePos = r.getMousePosPublic(e);
      tryStartCascade(r, first, e);
      return;
    }
    if (secondCan && newSecond < threshold) {
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("second");
      collapsedWhich = "second";
      collapseMousePos = r.getMousePosPublic(e);
      tryStartCascade(r, second, e);
      return;
    }

    const finalFirst = Math.max(newFirst, threshold);
    const finalSecond = Math.max(newSecond, threshold);

    if (first.classList.contains("collapsed")) {
      first.classList.remove("collapsed");
      saveCollapsed(key + "-first", false);
    }
    if (second.classList.contains("collapsed")) {
      second.classList.remove("collapsed");
      saveCollapsed(key + "-second", false);
    }

    r.setSizePublic(first, finalFirst);
    first.style.flexShrink = "0";
    first.style.flexGrow = "0";
    r.setSizePublic(second, finalSecond);
    second.style.flexShrink = "0";
    second.style.flexGrow = "0";
  }
}

/**
 * Apply final resize without magnetic snap — respects exact mouse position.
 * Used on mouseUp to ensure the final position matches where the user released.
 */
/** Apply final resize — no snap, no max. Only respects threshold (min). */
function applyResizeRaw(r: BaseResizer, delta: number): void {
  const first = r.getFirstPanel();
  const second = r.getSecondPanel();
  const threshold = r.getThresholdPx();
  const [startFirst, startSecond] = r.getStartSizes();
  const firstCan = r.getFirstCanCollapse();
  const secondCan = r.getSecondCanCollapse();

  if (secondCan && !firstCan) {
    const newSize = Math.max(threshold, startSecond - delta);
    const opposite = Math.max(threshold, startFirst + startSecond - newSize);
    r.setSizePublic(second, startFirst + startSecond - opposite);
    r.setSizePublic(first, opposite);
  } else if (firstCan && !secondCan) {
    const newSize = Math.max(threshold, startFirst + delta);
    const opposite = Math.max(threshold, startFirst + startSecond - newSize);
    r.setSizePublic(first, startFirst + startSecond - opposite);
    r.setSizePublic(second, opposite);
  } else {
    const newFirst = Math.max(threshold, startFirst + delta);
    const newSecond = Math.max(
      threshold,
      startSecond - (newFirst - startFirst),
    );
    r.setSizePublic(first, newFirst);
    r.setSizePublic(second, newSecond);
  }
}

/** Attempt to start cascade propagation after primary collapse */
function tryStartCascade(
  r: BaseResizer,
  collapsingPanel: HTMLElement,
  e: MouseEvent,
): void {
  const target = r.findCascadeTargetPublic(
    collapsingPanel,
    r.getMousePosPublic(e),
  );
  if (target) r.setPropagate(target);
}

/** Apply propagation delta to the cascade target */
function applyPropagation(r: BaseResizer, e: MouseEvent): void {
  const prop = r.getPropagate();
  if (!prop) return;

  const propDelta = r.getMousePosPublic(e) - prop.startPos;
  const snaps = getSnapPoints(r);
  const newSize = snap(r, prop.startSize + propDelta, snaps);

  if (newSize < prop.thresholdPx) {
    // Cascade: collapse target, find next
    cascadeCollapseTarget(r, prop);
    const next = r.findCascadeTargetPublic(prop.panel, r.getMousePosPublic(e));
    r.setPropagate(next);
    return;
  }

  r.setSizePublic(prop.panel, newSize);
  prop.panel.style.flexShrink = "0";
  prop.panel.style.flexGrow = "0";
}

/** Domino expansion: shrink the next sibling panel by overflow amount */
function tryExpandCascade(
  r: BaseResizer,
  squeezedPanel: HTMLElement,
  overflow: number,
  e: MouseEvent,
): void {
  // Find the next non-collapsed resizable panel beyond the squeezed one
  const target = r.findCascadeTargetPublic(
    squeezedPanel,
    r.getMousePosPublic(e),
  );
  if (!target) return;

  const newSize = target.startSize - overflow;
  if (newSize < target.thresholdPx) {
    // Cascade further: collapse this panel, find next
    cascadeCollapseTarget(r, target);
    const remaining = target.thresholdPx - newSize;
    const next = r.findCascadeTargetPublic(
      target.panel,
      r.getMousePosPublic(e),
    );
    if (next && remaining > 0) {
      const nextSize = next.startSize - remaining;
      if (nextSize >= next.thresholdPx) {
        r.setSizePublic(next.panel, nextSize);
        next.panel.style.flexShrink = "0";
        next.panel.style.flexGrow = "0";
      }
    }
    return;
  }

  r.setSizePublic(target.panel, newSize);
  target.panel.style.flexShrink = "0";
  target.panel.style.flexGrow = "0";
}

/** Collapse the current cascade propagation target */
function cascadeCollapseTarget(r: BaseResizer, prop: PropagationTarget): void {
  prop.panel.classList.add("collapsed");
  r.clearSizePublic(prop.panel);
  prop.panel.style.flexShrink = "";
  prop.panel.style.flexGrow = "";

  saveCollapsed(prop.storageKey, true);

  if (prop.toggleBtn && prop.toggleIcon) {
    updateToggleIcon(prop.toggleBtn, prop.toggleIcon, true);
  }
}
