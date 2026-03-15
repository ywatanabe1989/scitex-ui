/**
 * Panel state management — width, collapse, localStorage persistence.
 * Extracted from Workspace.tsx to keep component under line limit.
 */

import { useState, useEffect } from "react";

const COLLAPSE_WIDTH = 48;
const MIN_WIDTH = 80;

export { COLLAPSE_WIDTH, MIN_WIDTH };

export interface PanelState {
  width: number;
  collapsed: boolean;
  prevWidth: number;
}

export function loadPanelState(key: string, defaultWidth: number): PanelState {
  try {
    const savedW = localStorage.getItem(key);
    const savedC = localStorage.getItem(key + ":collapsed");
    const w = savedW ? parseInt(savedW, 10) : defaultWidth;
    return {
      width: w >= MIN_WIDTH ? w : defaultWidth,
      collapsed: savedC === "true",
      prevWidth: defaultWidth,
    };
  } catch {
    return { width: defaultWidth, collapsed: false, prevWidth: defaultWidth };
  }
}

export function savePanelState(key: string, state: PanelState) {
  try {
    if (!state.collapsed && state.width > COLLAPSE_WIDTH) {
      localStorage.setItem(key, state.width.toString());
    }
    localStorage.setItem(key + ":collapsed", state.collapsed.toString());
  } catch {}
}

/** Hook for a single panel with localStorage persistence */
export function usePanelState(key: string, defaultWidth: number) {
  const [state, setState] = useState(() => loadPanelState(key, defaultWidth));

  useEffect(() => {
    savePanelState(key, state);
  }, [state, key]);

  return [state, setState] as const;
}
