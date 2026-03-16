/**
 * useExpandCallbacks — expand/collapse/drop callbacks for Workspace panels.
 * Extracted to keep Workspace.tsx under 512 lines.
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PanelState } from "./usePanelState";
import { COLLAPSE_WIDTH } from "./usePanelState";

type SetPanel = Dispatch<SetStateAction<PanelState>>;

export function useExpandCallbacks(
  setConsole: SetPanel,
  setTree: SetPanel,
  setViewer: SetPanel,
  onFileDrop?: (path: string, target: string) => void,
) {
  const expandConsole = useCallback(() => {
    setConsole((s) => ({
      ...s,
      collapsed: false,
      width: s.prevWidth > COLLAPSE_WIDTH ? s.prevWidth : 380,
    }));
  }, [setConsole]);

  const expandTree = useCallback(() => {
    setTree((s) => ({
      ...s,
      collapsed: false,
      width: s.prevWidth > COLLAPSE_WIDTH ? s.prevWidth : 240,
    }));
  }, [setTree]);

  const expandViewer = useCallback(() => {
    setViewer((s) => ({
      ...s,
      collapsed: false,
      width: s.prevWidth > COLLAPSE_WIDTH ? s.prevWidth : 300,
    }));
  }, [setViewer]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const path = e.dataTransfer.getData("text/plain");
      if (path && onFileDrop) onFileDrop(path, "app");
    },
    [onFileDrop],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return {
    expandConsole,
    expandTree,
    expandViewer,
    handleDrop,
    handleDragOver,
  };
}
