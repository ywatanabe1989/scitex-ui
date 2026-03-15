/**
 * Drag-resize logic for Workspace panel columns.
 * Extracted from Workspace.tsx to keep component under line limit.
 */

import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction, MouseEvent } from "react";
import type { PanelState } from "./usePanelState";
import { COLLAPSE_WIDTH, MIN_WIDTH } from "./usePanelState";

type SetPanel = Dispatch<SetStateAction<PanelState>>;

function disableTransitions(selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.style.transition = "none";
  });
}
function enableTransitions(selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.style.transition = "";
  });
}
const PANEL_SELECTOR =
  ".stx-workspace__console-panel, .stx-workspace__tree-panel";

export function useResizers(
  console_: PanelState,
  tree: PanelState,
  viewer: PanelState,
  setConsole: SetPanel,
  setTree: SetPanel,
  setViewer: SetPanel,
) {
  const dragging = useRef<string | null>(null);
  const dragStartX = useRef(0);
  const dragStartConsole = useRef(0);
  const dragStartTree = useRef(0);
  const propagating = useRef(false);
  const propagateStartX = useRef(0);
  const propagateStartWidth = useRef(0);

  /** Console resizer — propagates RIGHT to tree */
  const onConsoleResizerDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      dragging.current = "console";
      propagating.current = false;
      dragStartX.current = e.clientX;
      dragStartConsole.current = console_.collapsed
        ? COLLAPSE_WIDTH
        : console_.width;
      dragStartTree.current = tree.collapsed ? COLLAPSE_WIDTH : tree.width;
      if (console_.collapsed) {
        setConsole((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
        dragStartConsole.current = MIN_WIDTH;
      }
      disableTransitions(PANEL_SELECTOR);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: globalThis.MouseEvent) => {
        if (dragging.current !== "console") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartConsole.current + delta;
        if (newW < COLLAPSE_WIDTH) {
          setConsole((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartConsole.current,
          }));
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartTree.current;
          }
          if (propagating.current) {
            const propW =
              propagateStartWidth.current +
              (ev.clientX - propagateStartX.current);
            if (propW < COLLAPSE_WIDTH) {
              setTree((s) => ({
                ...s,
                collapsed: true,
                prevWidth: propagateStartWidth.current,
              }));
            } else {
              setTree((s) => ({
                ...s,
                collapsed: false,
                width: Math.min(propW, 500),
              }));
            }
          }
          return;
        }
        propagating.current = false;
        setConsole((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(600, newW)),
        }));
      };
      const onUp = () => {
        dragging.current = null;
        propagating.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        enableTransitions(PANEL_SELECTOR);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [console_, tree, setConsole, setTree],
  );

  /** Tree resizer — propagates LEFT to console */
  const onTreeResizerDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      dragging.current = "tree";
      propagating.current = false;
      dragStartX.current = e.clientX;
      dragStartTree.current = tree.collapsed ? COLLAPSE_WIDTH : tree.width;
      dragStartConsole.current = console_.collapsed
        ? COLLAPSE_WIDTH
        : console_.width;
      if (tree.collapsed) {
        setTree((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
        dragStartTree.current = MIN_WIDTH;
      }
      disableTransitions(PANEL_SELECTOR);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: globalThis.MouseEvent) => {
        if (dragging.current !== "tree") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartTree.current + delta;
        if (newW < COLLAPSE_WIDTH) {
          setTree((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartTree.current,
          }));
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartConsole.current;
          }
          if (propagating.current) {
            const propW =
              propagateStartWidth.current +
              (ev.clientX - propagateStartX.current);
            if (propW < COLLAPSE_WIDTH) {
              setConsole((s) => ({
                ...s,
                collapsed: true,
                prevWidth: propagateStartWidth.current,
              }));
            } else {
              setConsole((s) => ({
                ...s,
                collapsed: false,
                width: Math.max(MIN_WIDTH, Math.min(600, propW)),
              }));
            }
          }
          return;
        }
        propagating.current = false;
        setTree((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(500, newW)),
        }));
      };
      const onUp = () => {
        dragging.current = null;
        propagating.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        enableTransitions(PANEL_SELECTOR);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [tree, console_, setTree, setConsole],
  );

  /** Viewer resizer */
  const onViewerResizerDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = viewer.collapsed ? COLLAPSE_WIDTH : viewer.width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const onMove = (ev: globalThis.MouseEvent) => {
        const newW = startW + (ev.clientX - startX);
        if (newW < COLLAPSE_WIDTH) {
          setViewer((s) => ({ ...s, collapsed: true, prevWidth: startW }));
        } else {
          setViewer((s) => ({
            ...s,
            collapsed: false,
            width: Math.max(MIN_WIDTH, Math.min(600, newW)),
          }));
        }
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [viewer, setViewer],
  );

  return { onConsoleResizerDown, onTreeResizerDown, onViewerResizerDown };
}
