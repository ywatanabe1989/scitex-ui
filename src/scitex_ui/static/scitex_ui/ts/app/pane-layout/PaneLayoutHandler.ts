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

import type { PaneInfo, ResizerInfo } from "./_types";
import { COLLAPSE_WIDTH, RESIZER_WIDTH } from "./_types";
import { computeLayout } from "./_layout-compute";

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
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.direction =
      (container.dataset.direction as "horizontal" | "vertical") ||
      "horizontal";
    this.storagePrefix = container.dataset.paneLayout || "pane";

    container.style.display = "flex";
    container.style.flexDirection =
      this.direction === "horizontal" ? "row" : "column";
    container.style.overflow = "hidden";

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    this.panes = this.discoverPanes();
    console.log(
      `[PaneLayout] "${this.storagePrefix}" ${this.direction}: ${this.panes.length} panes`,
      this.panes.map((p) => `${p.id}${p.fixed ? "(fixed)" : ""}`),
    );
    this.resizers = this.createResizers();
    this.restoreState();
    this.runLayout();
    this.applyLayout();
    console.log(
      `[PaneLayout] Sizes:`,
      this.panes.map(
        (p) => `${p.id}=${p.collapsed ? "collapsed" : p.size + "px"}`,
      ),
    );
  }

  // ── Discovery ──────────────────────────────────────────────────────

  private discoverPanes(): PaneInfo[] {
    const sizeAttr = this.direction === "horizontal" ? "width" : "height";
    const minAttr = this.direction === "horizontal" ? "minWidth" : "minHeight";
    const defaultAttr =
      this.direction === "horizontal" ? "defaultWidth" : "defaultHeight";
    const panes: PaneInfo[] = [];
    let index = 0;
    for (const el of Array.from(this.container.children) as HTMLElement[]) {
      if (!el.hasAttribute("data-pane")) continue;
      const fixed = el.hasAttribute("data-fixed");
      const id =
        el.dataset.paneId || el.id || `pane-${this.storagePrefix}-${index}`;
      panes.push({
        el,
        id,
        index,
        fixed,
        fixedSize: parseInt(el.dataset[sizeAttr] || "0", 10),
        minSize: parseInt(el.dataset[minAttr] || "40", 10),
        defaultSize: parseInt(el.dataset[defaultAttr] || "0", 10),
        canCollapse: el.hasAttribute("data-can-collapse"),
        size: fixed
          ? parseInt(el.dataset[sizeAttr] || "0", 10)
          : parseInt(el.dataset[defaultAttr] || "0", 10),
        collapsed: false,
        collapseMode: null,
      });
      index++;
    }
    return panes;
  }

  // ── Resizer Creation ───────────────────────────────────────────────

  private createResizers(): ResizerInfo[] {
    const resizers: ResizerInfo[] = [];
    for (let i = 0; i < this.panes.length - 1; i++) {
      const left = this.findNonFixed(i, "left");
      const right = this.findNonFixed(i + 1, "right");
      if (!left || !right) continue;
      if (resizers.length > 0) {
        const last = resizers[resizers.length - 1];
        if (last.leftPartner === left && last.rightPartner === right) continue;
      }
      const el = document.createElement("div");
      el.className =
        this.direction === "horizontal"
          ? "panel-resizer pane-resizer pane-resizer--h"
          : "panel-resizer pane-resizer pane-resizer--v";
      el.setAttribute("data-pane-resizer", "");
      left.el.after(el);
      console.log(
        `[PaneLayout] Resizer ${resizers.length}: ${left.id} ↔ ${right.id}`,
      );
      const resizer: ResizerInfo = {
        el,
        leftPartner: left,
        rightPartner: right,
      };
      resizers.push(resizer);
      el.addEventListener("mousedown", (e) => this.onMouseDown(e, resizer));
      el.addEventListener("dblclick", () => this.onDblClick(resizer));
    }
    return resizers;
  }

  private findNonFixed(from: number, dir: "left" | "right"): PaneInfo | null {
    const step = dir === "left" ? -1 : 1;
    for (let i = from; i >= 0 && i < this.panes.length; i += step) {
      if (!this.panes[i].fixed) return this.panes[i];
    }
    return null;
  }

  // ── State ──────────────────────────────────────────────────────────

  private restoreState(): void {
    for (const p of this.panes) {
      if (p.fixed) continue;
      const s = this.load(`${p.id}-size`);
      if (s !== null) {
        const v = parseInt(s, 10);
        if (v >= p.minSize) p.size = v;
      }
      if (this.load(`${p.id}-collapsed`) === "true") {
        p.collapsed = true;
        p.collapseMode = "manual";
      }
    }
  }

  private runLayout(): void {
    const sz =
      this.direction === "horizontal"
        ? this.container.clientWidth
        : this.container.clientHeight;
    computeLayout(this.panes, sz, this.resizers.length, RESIZER_WIDTH);
  }

  private applyLayout(): void {
    const prop = this.direction === "horizontal" ? "width" : "height";
    for (const p of this.panes) {
      if (p.fixed) {
        this.setFlex(p.el, prop, p.fixedSize, "0", "0");
      } else if (p.collapsed) {
        this.setFlex(p.el, prop, COLLAPSE_WIDTH, "0", "0");
        p.el.classList.add("pane-collapsed");
        p.el.style.cursor = "pointer";
      } else {
        this.setFlex(p.el, prop, p.size, "0", p.defaultSize === 0 ? "1" : "0");
        p.el.classList.remove("pane-collapsed");
        p.el.style.cursor = "";
      }
      p.el.style.overflow = "hidden";
    }
    for (const r of this.resizers) {
      const p2 = this.direction === "horizontal" ? "width" : "height";
      r.el.style[p2] = `${RESIZER_WIDTH}px`;
      r.el.style.flexShrink = "0";
    }
  }

  private setFlex(
    el: HTMLElement,
    prop: string,
    size: number,
    shrink: string,
    grow: string,
  ): void {
    el.style[prop as any] = `${size}px`;
    el.style.flexBasis = `${size}px`;
    el.style.flexShrink = shrink;
    el.style.flexGrow = grow;
  }

  private applyPane(p: PaneInfo): void {
    const prop = this.direction === "horizontal" ? "width" : "height";
    if (p.collapsed) {
      this.setFlex(p.el, prop, COLLAPSE_WIDTH, "0", "0");
      p.el.classList.add("pane-collapsed");
      p.el.style.cursor = "pointer";
    } else {
      this.setFlex(p.el, prop, p.size, "0", p.defaultSize === 0 ? "1" : "0");
      p.el.classList.remove("pane-collapsed");
      p.el.style.cursor = "";
    }
  }

  // ── Drag ───────────────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent, r: ResizerInfo): void {
    e.preventDefault();
    this.dragging = true;
    this.dragResizer = r;
    this.dragStartPos = this.direction === "horizontal" ? e.clientX : e.clientY;
    const { leftPartner: L, rightPartner: R } = r;
    if (L.collapsed && L.collapseMode === "auto") {
      L.collapsed = false;
      L.collapseMode = null;
      L.size = L.minSize;
      this.applyPane(L);
    }
    if (R.collapsed && R.collapseMode === "auto") {
      R.collapsed = false;
      R.collapseMode = null;
      R.size = R.minSize;
      this.applyPane(R);
    }
    this.dragStartLeftSize = L.collapsed ? COLLAPSE_WIDTH : L.size;
    this.dragStartRightSize = R.collapsed ? COLLAPSE_WIDTH : R.size;
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
    const { leftPartner: L, rightPartner: R } = this.dragResizer;
    let nL = this.dragStartLeftSize + delta;
    let nR = this.dragStartRightSize - delta;
    // Clamp both sides — ensure neither goes below minSize
    if (nL < L.minSize) {
      nR += L.minSize - nL;
      nL = L.minSize;
    }
    if (nR < R.minSize) {
      nL += R.minSize - nR;
      nR = R.minSize;
    }
    // Final safety clamp (prevents cascading overflow)
    nL = Math.max(L.minSize, nL);
    nR = Math.max(R.minSize, nR);
    // Auto-collapse/expand
    this.autoCollapse(L, nL);
    this.autoCollapse(R, nR);
    if (!L.collapsed) {
      L.size = Math.max(L.minSize, nL);
      this.applyPane(L);
    }
    if (!R.collapsed) {
      R.size = Math.max(R.minSize, nR);
      this.applyPane(R);
    }
  }

  private autoCollapse(p: PaneInfo, newSize: number): void {
    if (newSize < p.minSize && p.canCollapse && !p.collapsed) {
      p.collapsed = true;
      p.collapseMode = "auto";
      this.applyPane(p);
    } else if (
      newSize > p.minSize &&
      p.collapsed &&
      p.collapseMode === "auto"
    ) {
      p.collapsed = false;
      p.collapseMode = null;
    }
  }

  private onMouseUp(): void {
    if (!this.dragging || !this.dragResizer) return;
    this.dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    const { leftPartner: L, rightPartner: R } = this.dragResizer;
    if (!L.collapsed) this.save(`${L.id}-size`, String(L.size));
    if (!R.collapsed) this.save(`${R.id}-size`, String(R.size));
    this.dragResizer = null;
  }

  // ── Double-click ───────────────────────────────────────────────────

  private onDblClick(r: ResizerInfo): void {
    const t =
      r.leftPartner.size <= r.rightPartner.size
        ? r.leftPartner
        : r.rightPartner;
    if (!t.canCollapse) return;
    if (t.collapsed) {
      t.collapsed = false;
      t.collapseMode = null;
      const s = this.load(`${t.id}-size`);
      t.size = s
        ? Math.max(t.minSize, parseInt(s, 10))
        : t.defaultSize || t.minSize * 3;
      this.save(`${t.id}-collapsed`, "false");
    } else {
      t.collapsed = true;
      t.collapseMode = "manual";
      this.save(`${t.id}-collapsed`, "true");
    }
    this.applyPane(t);
    this.runLayout();
    this.applyLayout();
  }

  // ── Storage ────────────────────────────────────────────────────────

  private load(k: string): string | null {
    try {
      return localStorage.getItem(`${this.storagePrefix}-${k}`);
    } catch {
      return null;
    }
  }
  private save(k: string, v: string): void {
    try {
      localStorage.setItem(`${this.storagePrefix}-${k}`, v);
    } catch {}
  }

  // ── Cleanup ────────────────────────────────────────────────────────

  destroy(): void {
    document.removeEventListener("mousemove", this.boundMouseMove);
    document.removeEventListener("mouseup", this.boundMouseUp);
    for (const r of this.resizers) r.el.remove();
    this.resizers = [];
    this.panes = [];
  }
}
