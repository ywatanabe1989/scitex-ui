/**
 * FileItem — single file row in the workspace files tree.
 * Matches scitex-cloud _TreeRenderer.ts renderFile() output exactly.
 *
 * DOM structure produced:
 *   <div class="wft-item wft-file [selected] [wft-search-*]" data-path="..." draggable>
 *     <span class="wft-spacer" />       ← spacer (no chevron for files)
 *     <span class="wft-icon" />         ← hidden by CSS
 *     <span class="wft-name">filename</span>
 *   </div>
 */

import React from "react";
import type { FileNode } from "./types";

export interface FileItemProps {
  node: FileNode;
  activeFile: string | null;
  onSelect: (node: FileNode) => void;
  searchMatches?: Set<string>;
  searchActive?: boolean;
}

export const FileItem: React.FC<FileItemProps> = ({
  node,
  activeFile,
  onSelect,
  searchMatches,
  searchActive,
}) => {
  const isSelected = node.path === activeFile || node.is_current;

  const classes = ["wft-item", "wft-file"];
  if (isSelected) classes.push("selected");
  if (searchActive) {
    if (searchMatches?.has(node.path)) classes.push("wft-search-match");
    else classes.push("wft-search-dim");
  }

  return (
    <div
      className={classes.join(" ")}
      data-path={node.path}
      data-action="select"
      draggable={true}
      style={{ paddingLeft: 8 }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", node.path);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
    >
      {/* Spacer — scitex-cloud: files use wft-spacer, not chevron */}
      <span className="wft-spacer" />
      {/* Icon — hidden by CSS: .wft-icon { display: none } */}
      <span className="wft-icon" />
      {/* File name */}
      <span className="wft-name">{node.name}</span>
    </div>
  );
};
