/**
 * WorkspaceResizeContext — unified resize coordination across shell + app panes.
 *
 * The Workspace shell manages columns (Console|Files|Viewer|AppContent).
 * The app content manages its own inner columns (e.g., DataTable|Figure|Details).
 *
 * This context allows force to propagate ACROSS the shell/app boundary:
 * - Dragging an app-inner resizer leftward past the app boundary → shrinks Viewer → Files → Console
 * - Dragging a shell resizer rightward into app content → shrinks app's leftmost inner pane
 *
 * Architecture:
 *   Workspace provides the context.
 *   App inner panes register via useWorkspaceResize().
 *   Shell resizers and app resizers both call propagateForce() when they hit boundaries.
 */

import React, { createContext, useCallback, useContext, useRef } from "react";

export interface ResizePane {
  id: string;
  /** Get current width */
  getWidth: () => number;
  /** Set width (clamped by the pane's own min/max) */
  setWidth: (w: number) => void;
  /** Minimum width before collapse */
  minWidth: number;
  /** Collapse this pane */
  collapse: () => void;
  /** Whether this pane is currently collapsed */
  isCollapsed: () => boolean;
}

interface WorkspaceResizeContextValue {
  /** Register an app-inner pane for cross-boundary resize */
  registerPane: (pane: ResizePane) => void;
  /** Unregister when pane unmounts */
  unregisterPane: (id: string) => void;
  /** Propagate leftward force from the app boundary into shell panes */
  propagateLeft: (delta: number) => number;
  /** Propagate rightward force from the shell into app panes */
  propagateRight: (delta: number) => number;
}

const defaultCtx: WorkspaceResizeContextValue = {
  registerPane: () => {},
  unregisterPane: () => {},
  propagateLeft: () => 0,
  propagateRight: () => 0,
};

export const WorkspaceResizeContext =
  createContext<WorkspaceResizeContextValue>(defaultCtx);

export function useWorkspaceResize() {
  return useContext(WorkspaceResizeContext);
}

/**
 * Provider component — wrap around Workspace content.
 * The Workspace passes shell panel refs for cross-boundary propagation.
 */
export function WorkspaceResizeProvider({
  shellPanes,
  children,
}: {
  shellPanes: React.RefObject<ResizePane[]>;
  children: React.ReactNode;
}) {
  const appPanes = useRef<ResizePane[]>([]);

  const registerPane = useCallback((pane: ResizePane) => {
    appPanes.current = appPanes.current.filter((p) => p.id !== pane.id);
    appPanes.current.push(pane);
  }, []);

  const unregisterPane = useCallback((id: string) => {
    appPanes.current = appPanes.current.filter((p) => p.id !== id);
  }, []);

  /** Propagate leftward force from app boundary into shell panes (right to left) */
  const propagateLeft = useCallback(
    (delta: number): number => {
      const panels = shellPanes.current;
      if (!panels) return delta;

      let remaining = delta;
      // Iterate shell panes right-to-left
      for (let i = panels.length - 1; i >= 0 && remaining > 0; i--) {
        const p = panels[i];
        if (p.isCollapsed()) continue;

        const current = p.getWidth();
        const shrinkable = current - p.minWidth;

        if (shrinkable <= 0) {
          p.collapse();
          remaining -= p.minWidth;
          continue;
        }

        if (remaining <= shrinkable) {
          p.setWidth(current - remaining);
          remaining = 0;
        } else {
          p.collapse();
          remaining -= shrinkable;
        }
      }
      return remaining; // unconsumed delta
    },
    [shellPanes],
  );

  /** Propagate rightward force from shell into app panes (left to right) */
  const propagateRight = useCallback((delta: number): number => {
    let remaining = delta;
    // Iterate app panes left-to-right
    for (let i = 0; i < appPanes.current.length && remaining > 0; i++) {
      const p = appPanes.current[i];
      if (p.isCollapsed()) continue;

      const current = p.getWidth();
      const shrinkable = current - p.minWidth;

      if (shrinkable <= 0) {
        p.collapse();
        remaining -= p.minWidth;
        continue;
      }

      if (remaining <= shrinkable) {
        p.setWidth(current - remaining);
        remaining = 0;
      } else {
        p.collapse();
        remaining -= shrinkable;
      }
    }
    return remaining;
  }, []);

  return (
    <WorkspaceResizeContext.Provider
      value={{ registerPane, unregisterPane, propagateLeft, propagateRight }}
    >
      {children}
    </WorkspaceResizeContext.Provider>
  );
}
