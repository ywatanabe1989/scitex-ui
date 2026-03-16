/**
 * usePanelResize — shared hook for drag-resizable panels with auto-collapse.
 *
 * Features:
 * - Drag resize via mousedown on resizer element
 * - Auto-collapse when dragged to minWidth
 * - Double-click header to toggle collapse
 * - Viewport-bounded: panels never exceed container width
 * - localStorage persistence for width + collapsed state
 *
 * Usage:
 *   const panel = usePanelResize({
 *     direction: "left",
 *     minWidth: 40,
 *     defaultWidth: 350,
 *     storageKey: "my-app-data-width",
 *     collapseKey: "my-app-data-collapsed",
 *     containerRef,  // ref to parent flex container
 *   });
 *
 *   <aside style={{ width: panel.collapsed ? 40 : panel.width }}>
 *     <div {...panel.headerProps}>Header</div>
 *     <Content />
 *   </aside>
 *   <div className="resizer" {...panel.resizerProps} />
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface PanelResizeConfig {
  /** Which side the resizer is on relative to the panel */
  direction: "left" | "right";
  /** Minimum width before auto-collapse */
  minWidth: number;
  /** Default width when first rendered or expanded */
  defaultWidth: number;
  /** localStorage key for width persistence */
  storageKey: string;
  /** localStorage key for collapse state persistence */
  collapseKey: string;
  /** Maximum width (default: no limit beyond container) */
  maxWidth?: number;
  /** Ref to the flex container — used to cap total width */
  containerRef?: React.RefObject<HTMLElement>;
  /** Called when drag exceeds the panel boundary (for cross-boundary propagation) */
  onBoundaryOverflow?: (
    overflowPx: number,
    direction: "left" | "right",
  ) => void;
}

export interface PanelResizeResult {
  width: number;
  collapsed: boolean;
  resizerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
  };
  headerProps: {
    onDoubleClick: () => void;
    "data-tooltip": string;
  };
  toggleCollapse: () => void;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded */
  }
}

export function usePanelResize(config: PanelResizeConfig): PanelResizeResult {
  const {
    direction,
    minWidth,
    defaultWidth,
    storageKey,
    collapseKey,
    maxWidth,
    containerRef,
    onBoundaryOverflow,
  } = config;

  const [width, setWidth] = useState(() => {
    const saved = readStorage(storageKey);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= minWidth) return w;
    }
    return defaultWidth;
  });

  const [collapsed, setCollapsed] = useState(
    () => readStorage(collapseKey) === "true",
  );

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const saveWidth = useCallback(
    (w: number) => writeStorage(storageKey, w.toString()),
    [storageKey],
  );

  const saveCollapsed = useCallback(
    (c: boolean) => writeStorage(collapseKey, c.toString()),
    [collapseKey],
  );

  /** Clamp width to maxWidth and container bounds */
  const clampWidth = useCallback(
    (w: number): number => {
      let capped = Math.max(minWidth, w);
      if (maxWidth) capped = Math.min(capped, maxWidth);

      // Cap to container available space (prevent pushing siblings off-screen)
      if (containerRef?.current) {
        const containerW = containerRef.current.clientWidth;
        // Leave at least 200px for other content
        capped = Math.min(capped, containerW - 200);
      }

      return capped;
    },
    [minWidth, maxWidth, containerRef],
  );

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(next);
      if (!next) {
        const saved = readStorage(storageKey);
        if (saved) {
          const w = parseInt(saved, 10);
          if (w > minWidth + 10) {
            setWidth(w);
            return next;
          }
        }
        setWidth(defaultWidth);
      }
      return next;
    });
  }, [saveCollapsed, storageKey, minWidth, defaultWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) {
        setCollapsed(false);
        saveCollapsed(false);
        setWidth(minWidth);
      }

      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = collapsed ? minWidth : width;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [collapsed, width, minWidth, saveCollapsed],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const raw =
        direction === "left"
          ? startWidth.current + delta
          : startWidth.current - delta;
      const clamped = clampWidth(raw);
      if (clamped >= minWidth) {
        setWidth(clamped);
      }
      // Cross-boundary propagation: when drag exceeds the panel boundary
      if (raw < minWidth && onBoundaryOverflow) {
        const overflow = minWidth - raw;
        onBoundaryOverflow(overflow, direction === "left" ? "left" : "right");
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Apply final position
      onMouseMove(e);
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      setWidth((current) => {
        if (current <= minWidth + 10) {
          setCollapsed(true);
          saveCollapsed(true);
          return defaultWidth;
        }
        saveWidth(current);
        return current;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [direction, minWidth, defaultWidth, saveWidth, saveCollapsed, clampWidth]);

  return {
    width,
    collapsed,
    resizerProps: { onMouseDown, onDoubleClick: toggleCollapse },
    headerProps: {
      onDoubleClick: toggleCollapse,
      "data-tooltip": collapsed
        ? "Double-click to expand"
        : "Double-click to collapse",
    },
    toggleCollapse,
  };
}
