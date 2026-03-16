/**
 * useShellPanes — creates ResizePane descriptors for workspace shell panels.
 *
 * Used by WorkspaceResizeProvider to enable cross-boundary propagation
 * between shell panes (Console|Files|Viewer) and app inner panes.
 */

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PanelState } from "./usePanelState";
import { COLLAPSE_WIDTH } from "./usePanelState";
import type { ResizePane } from "./WorkspaceResizeContext";

type SetPanel = Dispatch<SetStateAction<PanelState>>;

export function useShellPanes(
  console_: PanelState,
  tree: PanelState,
  viewer: PanelState,
  setConsole: SetPanel,
  setTree: SetPanel,
  setViewer: SetPanel,
) {
  const ref = useRef<ResizePane[]>([]);

  useEffect(() => {
    ref.current = [
      {
        id: "console",
        getWidth: () => (console_.collapsed ? COLLAPSE_WIDTH : console_.width),
        setWidth: (w) =>
          setConsole((s) => ({ ...s, width: w, collapsed: false })),
        minWidth: COLLAPSE_WIDTH,
        collapse: () =>
          setConsole((s) => ({
            ...s,
            collapsed: true,
            prevWidth: s.width,
          })),
        isCollapsed: () => console_.collapsed,
      },
      {
        id: "tree",
        getWidth: () => (tree.collapsed ? COLLAPSE_WIDTH : tree.width),
        setWidth: (w) => setTree((s) => ({ ...s, width: w, collapsed: false })),
        minWidth: COLLAPSE_WIDTH,
        collapse: () =>
          setTree((s) => ({
            ...s,
            collapsed: true,
            prevWidth: s.width,
          })),
        isCollapsed: () => tree.collapsed,
      },
      {
        id: "viewer",
        getWidth: () => (viewer.collapsed ? COLLAPSE_WIDTH : viewer.width),
        setWidth: (w) =>
          setViewer((s) => ({ ...s, width: w, collapsed: false })),
        minWidth: COLLAPSE_WIDTH,
        collapse: () =>
          setViewer((s) => ({
            ...s,
            collapsed: true,
            prevWidth: s.width,
          })),
        isCollapsed: () => viewer.collapsed,
      },
    ];
  }, [console_, tree, viewer, setConsole, setTree, setViewer]);

  return ref;
}
