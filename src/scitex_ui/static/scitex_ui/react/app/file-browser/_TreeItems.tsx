/**
 * TreeItems — renders a list of file/folder nodes recursively.
 * Includes FolderItem which owns its own children container.
 *
 * Matches scitex-cloud _TreeRenderer.ts renderItems() + renderFolder() exactly:
 *   - Alphabetical sort (mirrors scitex-cloud default "name" sort mode)
 *   - Folders: .wft-item.wft-folder + .wft-children.expanded indent guides
 *   - Files:   .wft-item.wft-file (delegated to FileItem)
 *   - Chevron: .wft-chevron span (Unicode ▸ rendered via CSS ::before)
 *   - Spacer:  .wft-spacer span (for empty-toggle folders)
 */

import React from "react";
import type { FileNode } from "./types";
import { FileItem } from "./_FileItem";

interface SharedProps {
  expanded: Set<string>;
  activeFile: string | null;
  showHidden: boolean;
  extensions: string[] | null;
  onToggle: (path: string) => void;
  onSelect: (node: FileNode) => void;
  searchMatches?: Set<string>;
  searchAncestors?: Set<string>;
  searchActive?: boolean;
}

/* ──────────────────────────────────────────────────────────── */
/* FolderItem                                                    */
/* ──────────────────────────────────────────────────────────── */

interface FolderItemProps extends SharedProps {
  node: FileNode;
}

const FolderItem: React.FC<FolderItemProps> = ({
  node,
  expanded,
  activeFile,
  showHidden,
  extensions,
  onToggle,
  onSelect,
  searchMatches,
  searchAncestors,
  searchActive,
}) => {
  const isExpanded = expanded.has(node.path);
  const hasChildren = !!(node.children && node.children.length > 0);

  const classes = ["wft-item", "wft-folder"];
  if (isExpanded) classes.push("expanded");
  if (searchActive) {
    if (searchMatches?.has(node.path)) classes.push("wft-search-match");
    else if (searchAncestors?.has(node.path))
      classes.push("wft-search-ancestor");
    else classes.push("wft-search-dim");
  }

  return (
    <>
      {/* Folder row — matches scitex-cloud renderFolder() exactly */}
      <div
        className={classes.join(" ")}
        data-path={node.path}
        draggable={true}
        style={{ paddingLeft: 8 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(node.path);
        }}
      >
        {/* Folder toggle button */}
        <button
          type="button"
          className="wft-folder-toggle"
          data-action="toggle"
          data-path={node.path}
        >
          {hasChildren ? (
            <span className={`wft-chevron${isExpanded ? " expanded" : ""}`} />
          ) : (
            <span className="wft-spacer" />
          )}
          {/* Icon — hidden by CSS: .wft-icon { display: none } */}
          <span className="wft-icon" />
        </button>
        {/* Folder name — blue #6cb6ff via .wft-folder > .wft-name */}
        <span className="wft-name">{node.name}</span>
      </div>

      {/* Children container — CSS handles indent guides */}
      {hasChildren && (
        <div
          className={`wft-children${isExpanded ? " expanded" : ""}`}
          style={isExpanded ? undefined : { display: "none" }}
        >
          <TreeItems
            nodes={node.children!}
            expanded={expanded}
            activeFile={activeFile}
            showHidden={showHidden}
            extensions={extensions}
            onToggle={onToggle}
            onSelect={onSelect}
            searchMatches={searchMatches}
            searchAncestors={searchAncestors}
            searchActive={searchActive}
          />
        </div>
      )}
    </>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* TreeItems                                                     */
/* ──────────────────────────────────────────────────────────── */

export interface TreeItemsProps extends SharedProps {
  nodes: FileNode[];
}

export const TreeItems: React.FC<TreeItemsProps> = ({
  nodes,
  expanded,
  activeFile,
  showHidden,
  extensions,
  onToggle,
  onSelect,
  searchMatches,
  searchAncestors,
  searchActive,
}) => {
  const filtered = nodes.filter((n) => {
    if (!showHidden && n.name.startsWith(".")) return false;
    if (n.type === "file" && extensions) {
      const ext = "." + n.name.split(".").pop();
      if (!extensions.includes(ext)) return false;
    }
    return true;
  });

  // Alphabetical sort — mirrors scitex-cloud sortItems() "name" mode
  const sorted = [...filtered].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <>
      {sorted.map((node) =>
        node.type === "directory" ? (
          <FolderItem
            key={node.path}
            node={node}
            expanded={expanded}
            activeFile={activeFile}
            showHidden={showHidden}
            extensions={extensions}
            onToggle={onToggle}
            onSelect={onSelect}
            searchMatches={searchMatches}
            searchAncestors={searchAncestors}
            searchActive={searchActive}
          />
        ) : (
          <FileItem
            key={node.path}
            node={node}
            activeFile={activeFile}
            onSelect={onSelect}
            searchMatches={searchMatches}
            searchActive={searchActive}
          />
        ),
      )}
    </>
  );
};
