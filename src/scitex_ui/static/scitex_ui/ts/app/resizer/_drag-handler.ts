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

const D = "[Resizer:drag]"; // log prefix

/** Attach drag handling to a BaseResizer instance */
export function attachDragHandler(resizer: BaseResizer): void {
  const el = resizer.getResizerEl();
  el.addEventListener("mousedown", (e) => onMouseDown(resizer, e));
}

function onMouseDown(r: BaseResizer, e: MouseEvent): void {
  if (r.isClickOnToggle(e)) return;

  e.preventDefault();
  r.startDrag(e);
  const [sf, ss] = r.getStartSizes();
  const mousePos = r.getMousePosPublic(e);
  const resizerRect = r.getResizerEl().getBoundingClientRect();
  console.log(
    `${D} ▼ mousedown ${r.getStorageKey()}`,
    `\n  mouse: x=${e.clientX} y=${e.clientY} (axis=${mousePos})`,
    `\n  resizer: left=${Math.round(resizerRect.left)} top=${Math.round(resizerRect.top)} w=${Math.round(resizerRect.width)} h=${Math.round(resizerRect.height)}`,
    `\n  startPos=${r.getStartPos()}`,
    `\n  first: size=${sf} canCollapse=${r.getFirstCanCollapse()} collapsed=${r.getFirstPanel().classList.contains("collapsed")}`,
    `\n  second: size=${ss} canCollapse=${r.getSecondCanCollapse()} collapsed=${r.getSecondPanel().classList.contains("collapsed")}`,
    `\n  threshold=${r.getThresholdPx()} isInApp=${r.getIsInApp()}`,
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
}

/** Track the last raw (un-snapped) mouse position for mouseUp finalization */
let lastRawMousePos = 0;

/** Throttle mousemove logs to every Nth call */
let moveCount = 0;

function handleMouseMove(r: BaseResizer, e: MouseEvent): void {
  if (!r.isDraggingNow()) return;

  lastRawMousePos = r.getMousePosPublic(e);
  moveCount++;

  // If primary collapsed and propagation target exists, resize that instead
  if (r.isPrimaryCollapsed() && r.getPropagate()) {
    if (moveCount % 10 === 0) {
      const prop = r.getPropagate()!;
      console.log(
        `${D} → propagate ${r.getStorageKey()} mouse=${lastRawMousePos} target.size=${r.getSizePublic(prop.panel)}`,
      );
    }
    applyPropagation(r, e);
    return;
  }
  if (r.isPrimaryCollapsed()) {
    if (moveCount % 10 === 0) {
      console.log(
        `${D} → collapsed-idle ${r.getStorageKey()} mouse=${lastRawMousePos} (no propagation target)`,
      );
    }
    return;
  }

  const delta = lastRawMousePos - r.getStartPos();

  // Log every 5th move to avoid flooding
  if (moveCount % 5 === 0) {
    const [sf, ss] = r.getStartSizes();
    const firstCan = r.getFirstCanCollapse();
    const secondCan = r.getSecondCanCollapse();
    let mode = "both";
    if (secondCan && !firstCan) mode = "onlySecondCan";
    else if (firstCan && !secondCan) mode = "onlyFirstCan";
    console.log(
      `${D} → move #${moveCount} ${r.getStorageKey()}`,
      `\n  cursor: x=${e.clientX} y=${e.clientY} axis=${lastRawMousePos} delta=${delta.toFixed(0)} mode=${mode}`,
      `\n  first.w=${r.getSizePublic(r.getFirstPanel())} second.w=${r.getSizePublic(r.getSecondPanel())}`,
    );
  }

  applyResize(r, delta, e);
}

function handleMouseUp(
  r: BaseResizer,
  onMove: (e: MouseEvent) => void,
  cleanup: () => void,
): void {
  if (!r.isDraggingNow()) return;

  const primaryCollapsed = r.isPrimaryCollapsed();
  console.log(
    `${D} ▲ mouseup ${r.getStorageKey()}`,
    `\n  lastMouse=${lastRawMousePos} startPos=${r.getStartPos()} finalDelta=${(lastRawMousePos - r.getStartPos()).toFixed(0)}`,
    `\n  primaryCollapsed=${primaryCollapsed}`,
    `\n  first: size=${r.getSizePublic(r.getFirstPanel())} collapsed=${r.getFirstPanel().classList.contains("collapsed")}`,
    `\n  second: size=${r.getSizePublic(r.getSecondPanel())} collapsed=${r.getSecondPanel().classList.contains("collapsed")}`,
    `\n  moveCount=${moveCount}`,
  );

  // Apply final position using raw (un-snapped) mouse pos to respect
  // the actual endpoint — fixes high-speed drag not reaching destination
  if (!primaryCollapsed) {
    const finalDelta = lastRawMousePos - r.getStartPos();
    console.log(`${D}   applying final raw delta=${finalDelta.toFixed(0)}`);
    applyResizeRaw(r, finalDelta);
  } else {
    console.log(`${D}   skipping applyResizeRaw (primary is collapsed)`);
  }

  r.endDrag();
  moveCount = 0;

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

  // Save propagation target state
  const prop = r.getPropagate();
  if (prop) {
    const propSize = r.getSizePublic(prop.panel);
    console.log(`${D}   saving propagation target size=${propSize}`);
    if (propSize > prop.thresholdPx + 10) {
      saveSize(prop.storageKey, propSize);
    }
    r.clearPropagate();
  }

  r.fireOnDragEnd();
  r.saveStatePublic();

  console.log(
    `${D} ▲ mouseup DONE ${r.getStorageKey()}`,
    `\n  first: size=${r.getSizePublic(r.getFirstPanel())} collapsed=${r.getFirstPanel().classList.contains("collapsed")}`,
    `\n  second: size=${r.getSizePublic(r.getSecondPanel())} collapsed=${r.getSecondPanel().classList.contains("collapsed")}`,
  );
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
 * Only sizes ONE panel (the collapsible one). The other panel is sized by flex.
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
    const totalSize = startFirst + startSecond;
    const maxSize = totalSize - threshold; // protect first panel
    const newSize = Math.min(snap(r, startSecond - delta, snaps), maxSize);
    if (newSize < threshold) {
      console.log(
        `${D} ✦ COLLAPSE second ${key} newSize=${newSize.toFixed(0)} < threshold=${threshold}`,
        `mouse=${r.getMousePosPublic(e)}`,
      );
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("second");
      tryStartCascade(r, second, e);
      return;
    }
    if (second.classList.contains("collapsed")) {
      console.log(`${D} ✦ UN-COLLAPSE second ${key}`);
      second.classList.remove("collapsed");
      saveCollapsed(key + "-second", false);
    }
    r.setSizePublic(second, newSize);
    second.style.flexShrink = "0";
    second.style.flexGrow = "0";
  } else if (firstCan && !secondCan) {
    const totalSize = startFirst + startSecond;
    const maxSize = totalSize - threshold; // protect second panel
    const newSize = Math.min(snap(r, startFirst + delta, snaps), maxSize);
    if (newSize < threshold) {
      console.log(
        `${D} ✦ COLLAPSE first ${key} newSize=${newSize.toFixed(0)} < threshold=${threshold}`,
        `mouse=${r.getMousePosPublic(e)}`,
      );
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("first");
      tryStartCascade(r, first, e);
      return;
    }
    if (first.classList.contains("collapsed")) {
      console.log(`${D} ✦ UN-COLLAPSE first ${key}`);
      first.classList.remove("collapsed");
      saveCollapsed(key + "-first", false);
    }
    r.setSizePublic(first, newSize);
    first.style.flexShrink = "0";
    first.style.flexGrow = "0";
  } else {
    const newFirst = snap(r, startFirst + delta, snaps);
    let newSecond = startSecond - (newFirst - startFirst);

    if (firstCan && newFirst < threshold) {
      console.log(`${D} ✦ COLLAPSE first (both mode) ${key}`);
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("first");
      tryStartCascade(r, first, e);
      return;
    }
    if (secondCan && newSecond < threshold) {
      console.log(`${D} ✦ COLLAPSE second (both mode) ${key}`);
      r.markPrimaryCollapsed();
      r.collapsePanelPublic("second");
      tryStartCascade(r, second, e);
      return;
    }

    if (!firstCan && newFirst < threshold) {
      newSecond = startFirst + startSecond - threshold;
    }
    if (!secondCan && newSecond < threshold) newSecond = threshold;

    const finalFirst = !firstCan && newFirst < threshold ? threshold : newFirst;

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
    r.setSizePublic(second, newSecond);
    second.style.flexShrink = "0";
    second.style.flexGrow = "0";
  }
}

/**
 * Apply final resize without magnetic snap — respects exact mouse position.
 */
function applyResizeRaw(r: BaseResizer, delta: number): void {
  const first = r.getFirstPanel();
  const second = r.getSecondPanel();
  const threshold = r.getThresholdPx();
  const [startFirst, startSecond] = r.getStartSizes();
  const firstCan = r.getFirstCanCollapse();
  const secondCan = r.getSecondCanCollapse();

  if (secondCan && !firstCan) {
    const totalSize = startFirst + startSecond;
    const maxSize = totalSize - threshold;
    const newSize = Math.max(threshold, Math.min(startSecond - delta, maxSize));
    console.log(
      `${D}   applyResizeRaw second: ${newSize.toFixed(0)} (delta=${delta.toFixed(0)})`,
    );
    r.setSizePublic(second, newSize);
  } else if (firstCan && !secondCan) {
    const totalSize = startFirst + startSecond;
    const maxSize = totalSize - threshold;
    const newSize = Math.max(threshold, Math.min(startFirst + delta, maxSize));
    console.log(
      `${D}   applyResizeRaw first: ${newSize.toFixed(0)} (delta=${delta.toFixed(0)})`,
    );
    r.setSizePublic(first, newSize);
  } else {
    const newFirst = Math.max(threshold, startFirst + delta);
    const newSecond = Math.max(
      threshold,
      startSecond - (newFirst - startFirst),
    );
    console.log(
      `${D}   applyResizeRaw both: first=${newFirst.toFixed(0)} second=${newSecond.toFixed(0)}`,
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
  if (target) {
    console.log(
      `${D}   cascade target found: storageKey=${target.storageKey} size=${target.startSize}`,
    );
    r.setPropagate(target);
  } else {
    console.log(`${D}   no cascade target found`);
  }
}

/** Apply propagation delta to the cascade target */
function applyPropagation(r: BaseResizer, e: MouseEvent): void {
  const prop = r.getPropagate();
  if (!prop) return;

  const propDelta = r.getMousePosPublic(e) - prop.startPos;
  const snaps = getSnapPoints(r);
  const newSize = snap(r, prop.startSize + propDelta, snaps);

  if (newSize < prop.thresholdPx) {
    console.log(
      `${D}   cascade collapse: ${prop.storageKey} size=${newSize.toFixed(0)} < threshold=${prop.thresholdPx}`,
    );
    cascadeCollapseTarget(r, prop);
    const next = r.findCascadeTargetPublic(prop.panel, r.getMousePosPublic(e));
    r.setPropagate(next);
    return;
  }

  r.setSizePublic(prop.panel, newSize);
  prop.panel.style.flexShrink = "0";
  prop.panel.style.flexGrow = "0";
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
