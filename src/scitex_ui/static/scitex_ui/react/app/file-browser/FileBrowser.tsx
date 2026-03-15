/**
 * FileBrowser — React tree view for navigating file hierarchies.
 * Mirrors: ts/app/file-browser/_FileBrowser.ts
 *
 * Usage:
 *   import { FileBrowser } from '@scitex/ui/react/app/file-browser';
 *   <FileBrowser
 *     data={treeData}
 *     onFileSelect={(node) => openFile(node.path)}
 *     extensions={['.yaml', '.yml']}
 *     showFileCount
 *   />
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { FileBrowserProps, FileNode } from "./types";

const CLS = "stx-app-file-browser";

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: "fab fa-python",
    ts: "fas fa-code",
    js: "fab fa-js",
    css: "fab fa-css3-alt",
    html: "fab fa-html5",
    json: "fas fa-braces",
    yaml: "fas fa-file-code",
    yml: "fas fa-file-code",
    md: "fas fa-file-lines",
    png: "fas fa-image",
    jpg: "fas fa-image",
    svg: "fas fa-image",
    pdf: "fas fa-file-pdf",
  };
  return map[ext ?? ""] ?? "fas fa-file";
}

function countFiles(nodes: FileNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

interface FileItemProps {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  activeFile: string | null;
  showImageBadge: boolean;
  showHidden: boolean;
  extensions: string[] | null;
  onToggle: (path: string) => void;
  onSelect: (node: FileNode) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  node,
  depth,
  expanded,
  activeFile,
  showImageBadge,
  showHidden,
  extensions,
  onToggle,
  onSelect,
}) => {
  if (!showHidden && node.name.startsWith(".")) return null;

  if (node.type === "file" && extensions) {
    const ext = "." + node.name.split(".").pop();
    if (!extensions.includes(ext)) return null;
  }

  const isDir = node.type === "directory";
  const isExpanded = expanded.has(node.path);
  const isActive = node.path === activeFile || node.is_current;

  return (
    <>
      <div
        className={`${CLS}__item${isDir ? ` ${CLS}__item--directory` : ""}${isActive ? ` ${CLS}__item--active` : ""}`}
        data-depth={Math.min(depth, 5)}
        data-path={node.path}
        draggable={!isDir}
        onDragStart={
          isDir
            ? undefined
            : (e) => {
                e.dataTransfer.setData("text/plain", node.path);
                e.dataTransfer.effectAllowed = "copy";
              }
        }
        onClick={(e) => {
          e.stopPropagation();
          if (isDir) {
            onToggle(node.path);
          } else {
            onSelect(node);
          }
        }}
      >
        {isDir && (
          <i
            className={`${CLS}__chevron fas fa-chevron-right${isExpanded ? ` ${CLS}__chevron--expanded` : ""}`}
          />
        )}
        <i
          className={
            isDir
              ? isExpanded
                ? "fas fa-folder-open"
                : "fas fa-folder"
              : getFileIcon(node.name)
          }
        />
        <span className={`${CLS}__label`}>{node.name}</span>
        {!isDir && node.has_image && showImageBadge && (
          <span className={`${CLS}__badge`} title="Has companion image">
            PNG
          </span>
        )}
      </div>
      {isDir && isExpanded && node.children && (
        <FileList
          nodes={node.children}
          depth={depth + 1}
          expanded={expanded}
          activeFile={activeFile}
          showImageBadge={showImageBadge}
          showHidden={showHidden}
          extensions={extensions}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      )}
    </>
  );
};

interface FileListProps {
  nodes: FileNode[];
  depth: number;
  expanded: Set<string>;
  activeFile: string | null;
  showImageBadge: boolean;
  showHidden: boolean;
  extensions: string[] | null;
  onToggle: (path: string) => void;
  onSelect: (node: FileNode) => void;
}

const FileList: React.FC<FileListProps> = ({
  nodes,
  depth,
  expanded,
  activeFile,
  showImageBadge,
  showHidden,
  extensions,
  onToggle,
  onSelect,
}) => {
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {sorted.map((node) => (
        <FileItem
          key={node.path}
          node={node}
          depth={depth}
          expanded={expanded}
          activeFile={activeFile}
          showImageBadge={showImageBadge}
          showHidden={showHidden}
          extensions={extensions}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

/** Filter tree recursively — keep parents of matching children (ported from scitex-cloud) */
function filterTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query) return nodes;
  const lq = query.toLowerCase();
  const result: FileNode[] = [];
  for (const node of nodes) {
    if (node.type === "directory" && node.children) {
      const filtered = filterTree(node.children, query);
      if (node.name.toLowerCase().includes(lq) || filtered.length > 0) {
        result.push({
          ...node,
          children: filtered.length > 0 ? filtered : node.children,
        });
      }
    } else if (node.name.toLowerCase().includes(lq)) {
      result.push(node);
    }
  }
  return result;
}

/** Context menu for file tree items */
const ContextMenu: React.FC<{
  x: number;
  y: number;
  node: FileNode;
  onAction: (action: string) => void;
  onClose: () => void;
}> = ({ x, y, node, onAction, onClose }) => {
  const isDir = node.type === "directory";

  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div
      className={`${CLS}__context-menu`}
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {isDir && (
        <button onClick={() => onAction("new")}>
          <i className="fas fa-plus" /> New File
        </button>
      )}
      <button onClick={() => onAction("rename")}>
        <i className="fas fa-pen" /> Rename
      </button>
      <button onClick={() => onAction("duplicate")}>
        <i className="fas fa-copy" /> Duplicate
      </button>
      <button onClick={() => onAction("copy-path")}>
        <i className="fas fa-clipboard" /> Copy Path
      </button>
      <div className={`${CLS}__context-divider`} />
      <button
        className={`${CLS}__context-danger`}
        onClick={() => onAction("delete")}
      >
        <i className="fas fa-trash" /> Delete
      </button>
    </div>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({
  data: propData,
  apiUrl,
  onFileSelect,
  onDirectoryToggle,
  extensions = null,
  showHidden = false,
  showImageBadge = true,
  showFileCount = false,
  searchable = false,
  onContextAction,
  className,
  style,
}) => {
  const [data, setData] = useState<FileNode[]>(propData ?? []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNode;
  } | null>(null);

  // Ctrl+K keyboard shortcut (ported from scitex-cloud WorkspaceKeyboardHandler)
  useEffect(() => {
    if (!searchable) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchVisible((v) => {
          if (!v) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
          } else {
            setSearchQuery("");
          }
          return !v;
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchable]);

  const filteredData = searchQuery ? filterTree(data, searchQuery) : data;

  useEffect(() => {
    if (propData) setData(propData);
  }, [propData]);

  useEffect(() => {
    if (apiUrl) {
      setLoading(true);
      fetch(apiUrl)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => {
          setData(Array.isArray(d) ? d : (d.tree ?? d.children ?? []));
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    }
  }, [apiUrl]);

  const handleToggle = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        const wasExpanded = next.has(path);
        if (wasExpanded) next.delete(path);
        else next.add(path);

        // Find the node for the callback
        if (onDirectoryToggle) {
          const findNode = (nodes: FileNode[]): FileNode | null => {
            for (const n of nodes) {
              if (n.path === path) return n;
              if (n.children) {
                const found = findNode(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          const node = findNode(data);
          if (node) onDirectoryToggle(node, !wasExpanded);
        }

        return next;
      });
    },
    [data, onDirectoryToggle],
  );

  const handleSelect = useCallback(
    (node: FileNode) => {
      setActiveFile(node.path);
      onFileSelect?.(node);
    },
    [onFileSelect],
  );

  if (loading) {
    return (
      <div className={`${CLS} ${className ?? ""}`} style={style}>
        <div className={`${CLS}__loading`}>
          <i className="fas fa-spinner fa-spin" /> Loading files...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${CLS} ${className ?? ""}`} style={style}>
        <div className={`${CLS}__error`}>
          <i className="fas fa-exclamation-triangle" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className ?? ""}`} style={style}>
      {showFileCount && (
        <div className={`${CLS}__header`}>
          {countFiles(data)} file{countFiles(data) !== 1 ? "s" : ""}
        </div>
      )}
      {searchable && searchVisible && (
        <div className={`${CLS}__search`}>
          <div className={`${CLS}__search-wrap`}>
            <i className="fas fa-search" />
            <input
              ref={searchInputRef}
              className={`${CLS}__search-input`}
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  setSearchVisible(false);
                }
              }}
            />
            {searchQuery && (
              <button
                className={`${CLS}__search-clear`}
                onClick={() => setSearchQuery("")}
                title="Clear (Esc)"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>
      )}
      <nav
        className={CLS}
        onContextMenu={
          onContextAction
            ? (e) => {
                const item = (e.target as HTMLElement).closest(
                  `.${CLS}__item`,
                ) as HTMLElement | null;
                if (!item) return;
                e.preventDefault();
                const path = item.dataset.path;
                if (!path) return;
                const findNode = (nodes: FileNode[]): FileNode | null => {
                  for (const n of nodes) {
                    if (n.path === path) return n;
                    if (n.children) {
                      const found = findNode(n.children);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                const node = findNode(data);
                if (node) setContextMenu({ x: e.clientX, y: e.clientY, node });
              }
            : undefined
        }
      >
        {filteredData.length === 0 ? (
          <div className={`${CLS}__empty`}>
            {searchQuery ? "No matching files" : "No files to display"}
          </div>
        ) : (
          <FileList
            nodes={filteredData}
            depth={0}
            expanded={expanded}
            activeFile={activeFile}
            showImageBadge={showImageBadge}
            showHidden={showHidden}
            extensions={extensions}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        )}
      </nav>
      {contextMenu && onContextAction && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onAction={(action) => {
            onContextAction(
              action as "new" | "rename" | "delete" | "duplicate" | "copy-path",
              contextMenu.node,
            );
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
