/**
 * ContextMenu — right-click context menu for file tree items.
 * Matches scitex-cloud .wft-context-menu DOM structure exactly.
 *
 * DOM structure produced:
 *   <div class="wft-context-menu" style="position:fixed; top:y; left:x">
 *     <div class="wft-context-item context-new-file">...</div>
 *     <div class="wft-context-item context-rename">...</div>
 *     <div class="wft-context-item context-duplicate">...</div>
 *     <div class="wft-context-item">Copy Path</div>
 *     <div class="wft-context-separator" />
 *     <div class="wft-context-item context-delete">...</div>
 *   </div>
 */

import React, { useEffect } from "react";
import type { FileNode } from "./types";

export type ContextAction =
  | "new"
  | "rename"
  | "delete"
  | "duplicate"
  | "copy-path";

export interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onAction: (action: ContextAction) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  node,
  onAction,
  onClose,
}) => {
  const isDir = node.type === "directory";

  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div
      className="wft-context-menu"
      style={{ position: "fixed", top: y, left: x, zIndex: 10000 }}
      onClick={(e) => e.stopPropagation()}
    >
      {isDir && (
        <div
          className="wft-context-item context-new-file"
          onClick={() => onAction("new")}
        >
          <span className="wft-context-icon">
            <i className="fas fa-plus" />
          </span>
          <span className="wft-context-label">New File</span>
        </div>
      )}
      <div
        className="wft-context-item context-rename"
        onClick={() => onAction("rename")}
      >
        <span className="wft-context-icon">
          <i className="fas fa-pen" />
        </span>
        <span className="wft-context-label">Rename</span>
      </div>
      <div
        className="wft-context-item context-duplicate"
        onClick={() => onAction("duplicate")}
      >
        <span className="wft-context-icon">
          <i className="fas fa-copy" />
        </span>
        <span className="wft-context-label">Duplicate</span>
      </div>
      <div className="wft-context-item" onClick={() => onAction("copy-path")}>
        <span className="wft-context-icon">
          <i className="fas fa-clipboard" />
        </span>
        <span className="wft-context-label">Copy Path</span>
      </div>
      <div className="wft-context-separator" />
      <div
        className="wft-context-item context-delete"
        onClick={() => onAction("delete")}
      >
        <span className="wft-context-icon">
          <i className="fas fa-trash" />
        </span>
        <span className="wft-context-label">Delete</span>
      </div>
    </div>
  );
};
