/**
 * Drag-resize logic for Workspace panel columns.
 *
 * All panels are treated as an ordered array. Each resizer sits between
 * panel[i] and panel[i+1]. When a panel collapses during drag, the force
 * cascades to the next panel in the same direction (domino/curtain effect).
 */

import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction, MouseEvent } from "react";
import type { PanelState } from "./usePanelState";
import { COLLAPSE_WIDTH, MIN_WIDTH } from "./usePanelState";

type SetPanel = Dispatch<SetStateAction<PanelState>>;

const MAX_WIDTH = 600;

function disableTransitions() {
  document
    .querySelectorAll<HTMLElement>(
      ".stx-workspace__console-panel, .stx-workspace__tree-panel, .stx-workspace__viewer-panel",
    )
    .forEach((el) => (el.style.transition = "none"));
}
function enableTransitions() {
  document
    .querySelectorAll<HTMLElement>(
      ".stx-workspace__console-panel, .stx-workspace__tree-panel, .stx-workspace__viewer-panel",
    )
    .forEach((el) => (el.style.transition = ""));
}

interface PanelRef {
  state: PanelState;
  set: SetPanel;
  startWidth: number;
}

export function useResizers(
  console_: PanelState,
  tree: PanelState,
  viewer: PanelState,
  setConsole: SetPanel,
  setTree: SetPanel,
  setViewer: SetPanel,
) {
  const dragging = useRef(false);

  /**
   * Generic resizer between panels[leftIdx] and panels[leftIdx+1].
   *
   * Delta > 0 → moving right → left panel grows, right panel shrinks.
   * When a panel collapses, cascade continues to the next panel
   * in the same direction.
   */
  function startDrag(e: MouseEvent, panels: PanelRef[], leftIdx: number) {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;

    // Expand collapsed panels at the resize boundary
    const left = panels[leftIdx];
    const right = panels[leftIdx + 1];
    if (left?.state.collapsed) {
      left.set((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
      left.startWidth = MIN_WIDTH;
    }
    if (right?.state.collapsed) {
      right.set((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
      right.startWidth = MIN_WIDTH;
    }

    disableTransitions();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    // Track cascade state: which panels are being affected
    const cascadeState = {
      /** Index of the panel currently being shrunk on the LEFT side */
      shrinkLeftIdx: leftIdx,
      /** Index of the panel currently being shrunk on the RIGHT side */
      shrinkRightIdx: leftIdx + 1,
      /** Accumulated delta consumed by collapsed panels */
      leftConsumed: 0,
      rightConsumed: 0,
    };

    const onMove = (ev: globalThis.MouseEvent) => {
      if (!dragging.current) return;
      const totalDelta = ev.clientX - startX;

      if (totalDelta > 0) {
        // Moving RIGHT → left panel grows, right panel(s) shrink
        applyRightward(panels, leftIdx, totalDelta, cascadeState);
      } else if (totalDelta < 0) {
        // Moving LEFT → right panel grows, left panel(s) shrink
        applyLeftward(panels, leftIdx, totalDelta, cascadeState);
      }
    };

    const onUp = (ev: globalThis.MouseEvent) => {
      onMove(ev); // Apply final position
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      enableTransitions();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /** Drag moving RIGHT: grow left panel, shrink right panel(s) with cascade */
  function applyRightward(
    panels: PanelRef[],
    originLeftIdx: number,
    totalDelta: number,
    _cascade: { shrinkRightIdx: number; rightConsumed: number },
  ) {
    // Grow the left panel
    const left = panels[originLeftIdx];
    const newLeftW = Math.max(
      MIN_WIDTH,
      Math.min(MAX_WIDTH, left.startWidth + totalDelta),
    );
    left.set((s) => ({ ...s, collapsed: false, width: newLeftW }));

    // Shrink right panels with cascade
    let remainingDelta = totalDelta;

    for (let i = originLeftIdx + 1; i < panels.length; i++) {
      const p = panels[i];
      const newW = p.startWidth - remainingDelta;

      if (newW < COLLAPSE_WIDTH) {
        // Collapse this panel, cascade remainder to next
        p.set((s) => ({ ...s, collapsed: true, prevWidth: p.startWidth }));
        remainingDelta -= p.startWidth - COLLAPSE_WIDTH;
      } else {
        p.set((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newW)),
        }));
        break; // Absorbed all delta
      }
    }
  }

  /** Drag moving LEFT: grow right panel, shrink left panel(s) with cascade */
  function applyLeftward(
    panels: PanelRef[],
    originLeftIdx: number,
    totalDelta: number, // negative
    _cascade: { shrinkLeftIdx: number; leftConsumed: number },
  ) {
    // Grow the right panel
    const right = panels[originLeftIdx + 1];
    if (right) {
      const newRightW = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, right.startWidth - totalDelta),
      );
      right.set((s) => ({ ...s, collapsed: false, width: newRightW }));
    }

    // Shrink left panels with cascade
    let remainingDelta = -totalDelta; // make positive

    for (let i = originLeftIdx; i >= 0; i--) {
      const p = panels[i];
      const newW = p.startWidth - remainingDelta;

      if (newW < COLLAPSE_WIDTH) {
        // Collapse this panel, cascade remainder to next
        p.set((s) => ({ ...s, collapsed: true, prevWidth: p.startWidth }));
        remainingDelta -= p.startWidth - COLLAPSE_WIDTH;
      } else {
        p.set((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newW)),
        }));
        break; // Absorbed all delta
      }
    }
  }

  /** Console resizer (between console and tree) */
  const onConsoleResizerDown = useCallback(
    (e: MouseEvent) => {
      startDrag(
        e,
        [
          {
            state: console_,
            set: setConsole,
            startWidth: console_.collapsed ? COLLAPSE_WIDTH : console_.width,
          },
          {
            state: tree,
            set: setTree,
            startWidth: tree.collapsed ? COLLAPSE_WIDTH : tree.width,
          },
          {
            state: viewer,
            set: setViewer,
            startWidth: viewer.collapsed ? COLLAPSE_WIDTH : viewer.width,
          },
        ],
        0,
      );
    },
    [console_, tree, viewer, setConsole, setTree, setViewer],
  );

  /** Tree resizer (between tree and viewer) */
  const onTreeResizerDown = useCallback(
    (e: MouseEvent) => {
      startDrag(
        e,
        [
          {
            state: console_,
            set: setConsole,
            startWidth: console_.collapsed ? COLLAPSE_WIDTH : console_.width,
          },
          {
            state: tree,
            set: setTree,
            startWidth: tree.collapsed ? COLLAPSE_WIDTH : tree.width,
          },
          {
            state: viewer,
            set: setViewer,
            startWidth: viewer.collapsed ? COLLAPSE_WIDTH : viewer.width,
          },
        ],
        1,
      );
    },
    [console_, tree, viewer, setConsole, setTree, setViewer],
  );

  /** Viewer resizer (between viewer and app content) */
  const onViewerResizerDown = useCallback(
    (e: MouseEvent) => {
      startDrag(
        e,
        [
          {
            state: console_,
            set: setConsole,
            startWidth: console_.collapsed ? COLLAPSE_WIDTH : console_.width,
          },
          {
            state: tree,
            set: setTree,
            startWidth: tree.collapsed ? COLLAPSE_WIDTH : tree.width,
          },
          {
            state: viewer,
            set: setViewer,
            startWidth: viewer.collapsed ? COLLAPSE_WIDTH : viewer.width,
          },
        ],
        2,
      );
    },
    [console_, tree, viewer, setConsole, setTree, setViewer],
  );

  return { onConsoleResizerDown, onTreeResizerDown, onViewerResizerDown };
}
