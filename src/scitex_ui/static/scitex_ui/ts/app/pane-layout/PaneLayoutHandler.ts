/**
 * PaneLayoutHandler — unified pane resize system.
 *
 * One class handles everything: horizontal/vertical, fixed/resizable panes,
 * auto-collapse/expand, manual collapse, localStorage persistence.
 *
 * Usage (HTML):
 *   <div data-pane-layout="my-app" data-direction="horizontal">
 *     <div data-pane data-min-width="40" data-default-width="200" data-can-collapse>Left</div>
 *     <div data-pane data-fixed data-width="56">Nav</div>
 *     <div data-pane data-min-width="60" data-can-collapse>Center</div>
 *     <div data-pane data-min-width="40" data-default-width="240" data-can-collapse>Right</div>
 *   </div>
 *
 * The system auto-inserts resizer divs between non-fixed pane boundaries.
 * Each resizer seesaws the nearest non-fixed panes on each side.
 */

// ── Types ────────────────────────────────────────────────────────────

interface PaneInfo {
  el: HTMLElement;
  id: string;
  index: number;
  fixed: boolean;
  fixedSize: number;
  minSize: number;
  defaultSize: number;
  canCollapse: boolean;
  size: number;
  collapsed: boolean;
  collapseMode: "manual" | "auto" | null;
}

interface ResizerInfo {
  el: HTMLElement;
  leftPartner: PaneInfo;
  rightPartner: PaneInfo;
}

const COLLAPSE_WIDTH = 40;
const RESIZER_WIDTH = 1;

// ── Main Class ───────────────────────────────────────────────────────

export class PaneLayoutHandler {
  private container: HTMLElement;
  private direction: "horizontal" | "vertical";
  private storagePrefix: string;
  private panes: PaneInfo[] = [];
  private resizers: ResizerInfo[] = [];
  private dragging = false;
  private dragResizer: ResizerInfo | null = null;
  private dragStartPos = 0;
  private dragStartLeftSize = 0;
  private dragStartRightSize = 0;

  // Bound handlers for cleanup
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.direction =
      (container.dataset.direction as "horizontal" | "vertical") ||
      "horizontal";
    this.storagePrefix = container.dataset.paneLayout || "pane";

    // Ensure flex container
    container.style.display = "flex";
    container.style.flexDirection =
      this.direction === "horizontal" ? "row" : "column";
    container.style.overflow = "hidden";

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.panes = this.discoverPanes();
    console.debug(
      `[PaneLayout] "${this.storagePrefix}" ${this.direction}: ${this.panes.length} panes`,
      this.panes.map((p) => `${p.id}${p.fixed ? "(fixed)" : ""}`),
    );
    this.resizers = this.createResizers();
    this.restoreState();
    this.computeLayout();
    this.applyLayout();
    console.debug(
      `[PaneLayout] Sizes:`,
      this.panes.map(
        (p) => `${p.id}=${p.collapsed ? "collapsed" : p.size + "px"}`,
      ),
    );
  }

  // ── Discovery ────────────────────────────────────────────────────

  private discoverPanes(): PaneInfo[] {
    const sizeAttr = this.direction === "horizontal" ? "width" : "height";
    const minAttr = this.direction === "horizontal" ? "minWidth" : "minHeight";
    const defaultAttr =
      this.direction === "horizontal" ? "defaultWidth" : "defaultHeight";

    const panes: PaneInfo[] = [];
    const children = Array.from(this.container.children) as HTMLElement[];

    let index = 0;
    for (const el of children) {
      if (!el.hasAttribute("data-pane")) continue;

      const fixed = el.hasAttribute("data-fixed");
      const fixedSize = parseInt(el.dataset[sizeAttr] || "0", 10);
      const minSize = parseInt(el.dataset[minAttr] || "40", 10);
      const defaultSize = parseInt(el.dataset[defaultAttr] || "0", 10);
      const canCollapse = el.hasAttribute("data-can-collapse");
      const id =
        el.dataset.paneId || el.id || `pane-${this.storagePrefix}-${index}`;

      panes.push({
        el,
        id,
        index,
        fixed,
        fixedSize,
        minSize,
        defaultSize,
        canCollapse,
        size: fixed ? fixedSize : defaultSize,
        collapsed: false,
        collapseMode: null,
      });
      index++;
    }
    return panes;
  }

  // ── Resizer Creation ─────────────────────────────────────────────

  private createResizers(): ResizerInfo[] {
    const resizers: ResizerInfo[] = [];

    for (let i = 0; i < this.panes.length - 1; i++) {
      const left = this.findNonFixed(i, "left");
      const right = this.findNonFixed(i + 1, "right");
      if (!left || !right) continue;

      // Don't create duplicate resizers for the same pair
      if (
        resizers.length > 0 &&
        resizers[resizers.length - 1].leftPartner === left &&
        resizers[resizers.length - 1].rightPartner === right
      ) {
        continue;
      }

      const resizerEl = document.createElement("div");
      resizerEl.className =
        this.direction === "horizontal"
          ? "panel-resizer pane-resizer pane-resizer--h"
          : "panel-resizer pane-resizer pane-resizer--v";
      resizerEl.setAttribute("data-pane-resizer", "");

      // Insert before the right partner's element (resizer sits between the two partners)
      right.el.before(resizerEl);

      console.debug(
        `[PaneLayout] Resizer ${resizers.length}: ${left.id} ↔ ${right.id}`,
      );

      const resizer: ResizerInfo = {
        el: resizerEl,
        leftPartner: left,
        rightPartner: right,
      };
      resizers.push(resizer);

      // Bind events
      resizerEl.addEventListener("mousedown", (e) => {
        this.onMouseDown(e, resizer);
      });
      resizerEl.addEventListener("dblclick", () => {
        this.onResizerDoubleClick(resizer);
      });
    }

    return resizers;
  }

  /** Walk from index in given direction to find nearest non-fixed pane */
  private findNonFixed(
    fromIndex: number,
    direction: "left" | "right",
  ): PaneInfo | null {
    const step = direction === "left" ? -1 : 1;
    for (let i = fromIndex; i >= 0 && i < this.panes.length; i += step) {
      if (!this.panes[i].fixed) return this.panes[i];
    }
    return null;
  }

  // ── State Restoration ────────────────────────────────────────────

  private restoreState(): void {
    for (const pane of this.panes) {
      if (pane.fixed) continue;

      const savedSize = this.loadStorage(`${pane.id}-size`);
      if (savedSize !== null) {
        const s = parseInt(savedSize, 10);
        if (s >= pane.minSize) pane.size = s;
      }

      const savedCollapsed = this.loadStorage(`${pane.id}-collapsed`);
      if (savedCollapsed === "true") {
        pane.collapsed = true;
        pane.collapseMode = "manual";
      }
    }
  }

  // ── Layout Computation ───────────────────────────────────────────

  private computeLayout(): void {
    const containerSize =
      this.direction === "horizontal"
        ? this.container.clientWidth
        : this.container.clientHeight;

    // Budget: container minus fixed panes minus resizers
    const fixedTotal = this.panes
      .filter((p) => p.fixed)
      .reduce((s, p) => s + p.fixedSize, 0);
    const resizerTotal = this.resizers.length * RESIZER_WIDTH;
    const collapsedTotal = this.panes
      .filter((p) => !p.fixed && p.collapsed)
      .reduce(() => COLLAPSE_WIDTH, 0);
    const available =
      containerSize - fixedTotal - resizerTotal - collapsedTotal;

    // Non-fixed, non-collapsed panes
    const resizable = this.panes.filter((p) => !p.fixed && !p.collapsed);

    // Find the "remaining space" pane (no defaultSize)
    const remainingPane = resizable.find((p) => p.defaultSize === 0);
    const explicitPanes = resizable.filter((p) => p.defaultSize > 0);

    const explicitTotal = explicitPanes.reduce((s, p) => s + p.size, 0);

    if (remainingPane) {
      remainingPane.size = Math.max(
        remainingPane.minSize,
        available - explicitTotal,
      );
    } else if (resizable.length > 0) {
      // No remaining-space pane — distribute proportionally
      const total = resizable.reduce((s, p) => s + p.size, 0);
      if (total > 0) {
        const scale = available / total;
        for (const p of resizable) {
          p.size = Math.max(p.minSize, Math.round(p.size * scale));
        }
      }
    }
  }

  private applyLayout(): void {
    const prop = this.direction === "horizontal" ? "width" : "height";

    for (const pane of this.panes) {
      if (pane.fixed) {
        pane.el.style[prop] = `${pane.fixedSize}px`;
        pane.el.style.flexShrink = "0";
        pane.el.style.flexGrow = "0";
        pane.el.style.flexBasis = `${pane.fixedSize}px`;
        pane.el.style.overflow = "hidden";
      } else if (pane.collapsed) {
        pane.el.style[prop] = `${COLLAPSE_WIDTH}px`;
        pane.el.style.flexShrink = "0";
        pane.el.style.flexGrow = "0";
        pane.el.style.flexBasis = `${COLLAPSE_WIDTH}px`;
        pane.el.style.overflow = "hidden";
        pane.el.classList.add("pane-collapsed");
        pane.el.style.cursor = "pointer";
      } else {
        pane.el.style[prop] = `${pane.size}px`;
        pane.el.style.flexShrink = "0";
        pane.el.style.flexGrow = pane.defaultSize === 0 ? "1" : "0";
        pane.el.style.flexBasis = `${pane.size}px`;
        pane.el.style.overflow = "hidden";
        pane.el.classList.remove("pane-collapsed");
        pane.el.style.cursor = "";
      }
    }

    for (const r of this.resizers) {
      const prop2 = this.direction === "horizontal" ? "width" : "height";
      r.el.style[prop2] = `${RESIZER_WIDTH}px`;
      r.el.style.flexShrink = "0";
    }
  }

  // ── Drag Handling ────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent, resizer: ResizerInfo): void {
    e.preventDefault();
    this.dragging = true;
    this.dragResizer = resizer;
    this.dragStartPos = this.direction === "horizontal" ? e.clientX : e.clientY;

    // If either partner is auto-collapsed, expand it first
    const { leftPartner, rightPartner } = resizer;
    if (leftPartner.collapsed && leftPartner.collapseMode === "auto") {
      leftPartner.collapsed = false;
      leftPartner.collapseMode = null;
      leftPartner.size = leftPartner.minSize;
      this.applyPane(leftPartner);
    }
    if (rightPartner.collapsed && rightPartner.collapseMode === "auto") {
      rightPartner.collapsed = false;
      rightPartner.collapseMode = null;
      rightPartner.size = rightPartner.minSize;
      this.applyPane(rightPartner);
    }

    this.dragStartLeftSize = leftPartner.collapsed
      ? COLLAPSE_WIDTH
      : leftPartner.size;
    this.dragStartRightSize = rightPartner.collapsed
      ? COLLAPSE_WIDTH
      : rightPartner.size;

    document.body.style.cursor =
      this.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", this.boundMouseMove);
    document.addEventListener("mouseup", this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging || !this.dragResizer) return;

    const pos = this.direction === "horizontal" ? e.clientX : e.clientY;
    const delta = pos - this.dragStartPos;

    const { leftPartner, rightPartner } = this.dragResizer;

    let newLeft = this.dragStartLeftSize + delta;
    let newRight = this.dragStartRightSize - delta;

    // Clamp left
    if (newLeft < leftPartner.minSize) {
      const overflow = leftPartner.minSize - newLeft;
      newLeft = leftPartner.minSize;
      newRight = this.dragStartRightSize - delta + overflow;
    }

    // Clamp right
    if (newRight < rightPartner.minSize) {
      const overflow = rightPartner.minSize - newRight;
      newRight = rightPartner.minSize;
      newLeft = this.dragStartLeftSize + delta - overflow;
    }

    // Auto-collapse left
    if (
      newLeft <= leftPartner.minSize &&
      leftPartner.canCollapse &&
      !leftPartner.collapsed
    ) {
      leftPartner.collapsed = true;
      leftPartner.collapseMode = "auto";
      this.applyPane(leftPartner);
    } else if (
      newLeft > leftPartner.minSize &&
      leftPartner.collapsed &&
      leftPartner.collapseMode === "auto"
    ) {
      leftPartner.collapsed = false;
      leftPartner.collapseMode = null;
    }

    // Auto-collapse right
    if (
      newRight <= rightPartner.minSize &&
      rightPartner.canCollapse &&
      !rightPartner.collapsed
    ) {
      rightPartner.collapsed = true;
      rightPartner.collapseMode = "auto";
      this.applyPane(rightPartner);
    } else if (
      newRight > rightPartner.minSize &&
      rightPartner.collapsed &&
      rightPartner.collapseMode === "auto"
    ) {
      rightPartner.collapsed = false;
      rightPartner.collapseMode = null;
    }

    // Apply sizes directly to DOM (no framework re-render)
    if (!leftPartner.collapsed) {
      leftPartner.size = Math.max(leftPartner.minSize, newLeft);
      this.applyPane(leftPartner);
    }
    if (!rightPartner.collapsed) {
      rightPartner.size = Math.max(rightPartner.minSize, newRight);
      this.applyPane(rightPartner);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.dragging || !this.dragResizer) return;

    this.dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);

    // Persist final sizes
    const { leftPartner, rightPartner } = this.dragResizer;
    if (!leftPartner.collapsed) {
      this.saveStorage(`${leftPartner.id}-size`, String(leftPartner.size));
    }
    if (!rightPartner.collapsed) {
      this.saveStorage(`${rightPartner.id}-size`, String(rightPartner.size));
    }

    this.dragResizer = null;
  }

  /** Apply a single pane's style to DOM */
  private applyPane(pane: PaneInfo): void {
    const prop = this.direction === "horizontal" ? "width" : "height";

    if (pane.collapsed) {
      pane.el.style[prop] = `${COLLAPSE_WIDTH}px`;
      pane.el.style.flexBasis = `${COLLAPSE_WIDTH}px`;
      pane.el.style.flexGrow = "0";
      pane.el.classList.add("pane-collapsed");
      pane.el.style.cursor = "pointer";
    } else {
      pane.el.style[prop] = `${pane.size}px`;
      pane.el.style.flexBasis = `${pane.size}px`;
      pane.el.style.flexGrow = pane.defaultSize === 0 ? "1" : "0";
      pane.el.classList.remove("pane-collapsed");
      pane.el.style.cursor = "";
    }
  }

  // ── Double-click Collapse ────────────────────────────────────────

  private onResizerDoubleClick(resizer: ResizerInfo): void {
    // Toggle the smaller partner (or right if equal)
    const { leftPartner, rightPartner } = resizer;
    const target =
      leftPartner.size <= rightPartner.size ? leftPartner : rightPartner;

    if (!target.canCollapse) return;

    if (target.collapsed) {
      target.collapsed = false;
      target.collapseMode = null;
      // Restore from storage or use default
      const saved = this.loadStorage(`${target.id}-size`);
      target.size =
        saved !== null
          ? Math.max(target.minSize, parseInt(saved, 10))
          : target.defaultSize || target.minSize * 3;
      this.saveStorage(`${target.id}-collapsed`, "false");
    } else {
      target.collapsed = true;
      target.collapseMode = "manual";
      this.saveStorage(`${target.id}-collapsed`, "true");
    }

    this.applyPane(target);
    // Recompute remaining-space pane
    this.computeLayout();
    this.applyLayout();
  }

  // ── localStorage ─────────────────────────────────────────────────

  private loadStorage(key: string): string | null {
    try {
      return localStorage.getItem(`${this.storagePrefix}-${key}`);
    } catch {
      return null;
    }
  }

  private saveStorage(key: string, value: string): void {
    try {
      localStorage.setItem(`${this.storagePrefix}-${key}`, value);
    } catch {
      /* quota exceeded */
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  destroy(): void {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    for (const r of this.resizers) {
      r.el.remove();
    }
    this.resizers = [];
    this.panes = [];
  }
}
