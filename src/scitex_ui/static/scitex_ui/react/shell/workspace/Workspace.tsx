/**
 * Workspace — universal shell for all SciTeX apps.
 *
 * Ported from scitex-cloud's workspace-panel-resizer + stx-shell-sidebar.
 *
 * Layout: Console/Chat (left) | File Tree (mid) | App Content (right)
 *         ────────────── Status Bar ──────────────
 *
 * Interactions (matching scitex-cloud):
 * - Drag resizer = smooth curtain resize
 * - Smart collapse: panel collapses instantly when dragged below threshold
 * - Collapsed panels show vertical icon + label
 * - Click collapsed panel to expand
 * - localStorage persistence for width + collapse state
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";

const CLS = "stx-workspace";
const COLLAPSE_WIDTH = 48;

type ConsoleTab = "console" | "chat";

/** Hook for drag-to-resize with smart collapse (ported from scitex-cloud) */
function useResizer(
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
  storageKey: string,
) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const w = parseInt(saved, 10);
        if (w >= minWidth) return w;
      }
    } catch {}
    return defaultWidth;
  });

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey + ":collapsed") === "true";
    } catch {
      return false;
    }
  });

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const prevWidth = useRef(defaultWidth);

  // Persist width
  useEffect(() => {
    if (!collapsed && width > COLLAPSE_WIDTH) {
      try {
        localStorage.setItem(storageKey, width.toString());
      } catch {}
    }
  }, [width, collapsed, storageKey]);

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey + ":collapsed", collapsed.toString());
    } catch {}
  }, [collapsed, storageKey]);

  const _collapse = useCallback(() => {
    prevWidth.current = width;
    setCollapsed(true);
  }, [width]);
  void _collapse; // available for programmatic use

  const expand = useCallback(() => {
    setCollapsed(false);
    setWidth(
      prevWidth.current > COLLAPSE_WIDTH ? prevWidth.current : defaultWidth,
    );
  }, [defaultWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = collapsed ? COLLAPSE_WIDTH : width;

      // If collapsed, expand on drag start
      if (collapsed) {
        setCollapsed(false);
        setWidth(minWidth);
        startWidth.current = minWidth;
      }

      // Disable transitions during drag
      document
        .querySelectorAll<HTMLElement>(
          `.${CLS}__console-panel, .${CLS}__tree-panel`,
        )
        .forEach((el) => {
          el.style.transition = "none";
        });

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = Math.max(
          0,
          Math.min(maxWidth, startWidth.current + delta),
        );

        // Smart collapse: instant collapse during drag
        if (newWidth < COLLAPSE_WIDTH) {
          prevWidth.current = startWidth.current;
          setCollapsed(true);
          return;
        }

        setCollapsed(false);
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        // Re-enable transitions
        document
          .querySelectorAll<HTMLElement>(
            `.${CLS}__console-panel, .${CLS}__tree-panel`,
          )
          .forEach((el) => {
            el.style.transition = "";
          });
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, collapsed, minWidth, maxWidth],
  );

  return {
    width: collapsed ? COLLAPSE_WIDTH : width,
    collapsed,
    expand,
    resizerProps: { onMouseDown },
  };
}

export const Workspace: React.FC<WorkspaceProps> = ({
  appName,
  accentColor,
  terminalBackend,
  chatBackend,
  fileTreeBackend,
  highlightExtensions: _highlightExtensions,
  onFileSelect,
  onFileDrop,
  children,
  className,
  style,
}) => {
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("console");
  const [treeData, setTreeData] = useState<FileNode[]>([]);

  const consoleResizer = useResizer(300, 80, 600, `${appName}-console-width`);
  const treeResizer = useResizer(250, 80, 500, `${appName}-tree-width`);

  // Set accent color
  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty(
        "--stx-app-accent",
        accentColor,
      );
    }
    return () => {
      document.documentElement.style.removeProperty("--stx-app-accent");
    };
  }, [accentColor]);

  // Fetch file tree
  useEffect(() => {
    if (fileTreeBackend) {
      fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      fileTreeBackend.onTreeChange?.(() => {
        fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      });
    }
  }, [fileTreeBackend]);

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

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={style}
      data-app={appName}
    >
      <div className={`${CLS}__columns`}>
        {/* ── Column 1: Console/Chat Panel ──────────────────────── */}
        <div
          className={`${CLS}__console-panel${consoleResizer.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: consoleResizer.width }}
          onClick={consoleResizer.collapsed ? consoleResizer.expand : undefined}
        >
          {consoleResizer.collapsed ? (
            <div className={`${CLS}__collapsed-label`}>
              <i className="fas fa-terminal" />
              <span>Console</span>
            </div>
          ) : (
            <>
              <div className={`${CLS}__console-tabs`}>
                <button
                  className={`${CLS}__console-tab${consoleTab === "console" ? ` ${CLS}__console-tab--active` : ""}`}
                  onClick={() => setConsoleTab("console")}
                >
                  <i className="fas fa-terminal" /> Console
                </button>
                <button
                  className={`${CLS}__console-tab${consoleTab === "chat" ? ` ${CLS}__console-tab--active` : ""}`}
                  onClick={() => setConsoleTab("chat")}
                >
                  <i className="fas fa-comment" /> Chat
                </button>
              </div>
              <div className={`${CLS}__console-content`}>
                {consoleTab === "console" &&
                  (terminalBackend ? (
                    <Terminal backend={terminalBackend} />
                  ) : (
                    <div className={`${CLS}__placeholder`}>
                      <i className="fas fa-terminal" />
                      <p>No terminal backend</p>
                    </div>
                  ))}
                {consoleTab === "chat" &&
                  (chatBackend ? (
                    <Chat
                      backend={chatBackend}
                      storageKey={`${appName}-chat-messages`}
                    />
                  ) : (
                    <div className={`${CLS}__placeholder`}>
                      <i className="fas fa-comment" />
                      <p>No chat backend</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
        <div
          className={`${CLS}__resizer ${CLS}__resizer--vertical`}
          {...consoleResizer.resizerProps}
        />

        {/* ── Column 2: File Tree Panel ─────────────────────────── */}
        <div
          className={`${CLS}__tree-panel${treeResizer.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: treeResizer.width }}
          onClick={treeResizer.collapsed ? treeResizer.expand : undefined}
        >
          {treeResizer.collapsed ? (
            <div className={`${CLS}__collapsed-label`}>
              <i className="fas fa-folder" />
              <span>Files</span>
            </div>
          ) : (
            <>
              <div className={`${CLS}__tree-header`}>
                <i className="fas fa-folder" />
                <span>Files</span>
              </div>
              <FileBrowser
                data={treeData}
                onFileSelect={onFileSelect}
                showFileCount
                showImageBadge
              />
            </>
          )}
        </div>
        <div
          className={`${CLS}__resizer ${CLS}__resizer--vertical`}
          {...treeResizer.resizerProps}
        />

        {/* ── Column 3: App Content ─────────────────────────────── */}
        <div
          className={`${CLS}__app-content`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {children}
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────────────── */}
      <div className={`${CLS}__status-bar`}>
        <span className={`${CLS}__status-item`}>
          <i
            className="fas fa-circle"
            style={{ fontSize: 8, color: "var(--status-success)" }}
          />{" "}
          Connected
        </span>
        <div style={{ flex: 1 }} />
        <span className={`${CLS}__status-item`}>{appName}</span>
      </div>
    </div>
  );
};
