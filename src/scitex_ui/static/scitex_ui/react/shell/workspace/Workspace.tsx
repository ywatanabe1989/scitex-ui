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
 * - Curtain propagation: drag delta cascades to adjacent panel (domino)
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
const MIN_WIDTH = 80;

type ConsoleTab = "console" | "chat";

/** Centralized resize state for curtain propagation between panels */
interface PanelState {
  width: number;
  collapsed: boolean;
  prevWidth: number;
}

function loadPanelState(key: string, defaultWidth: number): PanelState {
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

function savePanelState(key: string, state: PanelState) {
  try {
    if (!state.collapsed && state.width > COLLAPSE_WIDTH) {
      localStorage.setItem(key, state.width.toString());
    }
    localStorage.setItem(key + ":collapsed", state.collapsed.toString());
  } catch {}
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
  onFileContextAction,
  getFileUrl: _getFileUrl,
  children,
  className,
  style,
}) => {
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("console");
  // Viewer pane state (WIP — will show file previews)
  const [_selectedFile, _setSelectedFile] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<FileNode[]>([]);

  // Centralized panel state for curtain propagation
  const consoleKey = `${appName}-console-width`;
  const treeKey = `${appName}-tree-width`;
  const [console_, setConsole] = useState(() =>
    loadPanelState(consoleKey, 380),
  );
  const [tree, setTree] = useState(() => loadPanelState(treeKey, 240));
  const viewerKey = `${appName}-viewer-width`;
  const [_viewer, _setViewer] = useState(() => loadPanelState(viewerKey, 300));

  // Persist on change
  useEffect(() => {
    savePanelState(consoleKey, console_);
  }, [console_, consoleKey]);
  useEffect(() => {
    savePanelState(treeKey, tree);
  }, [tree, treeKey]);
  useEffect(() => {
    savePanelState(viewerKey, _viewer);
  }, [_viewer, viewerKey]);

  // Dragging refs
  const dragging = useRef<"console" | "tree" | null>(null);
  const dragStartX = useRef(0);
  const dragStartConsole = useRef(0);
  const dragStartTree = useRef(0);
  const propagating = useRef(false);
  const propagateStartX = useRef(0);
  const propagateStartWidth = useRef(0);

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

  /** Start drag on console resizer */
  const onConsoleResizerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = "console";
      propagating.current = false;
      dragStartX.current = e.clientX;
      dragStartConsole.current = console_.collapsed
        ? COLLAPSE_WIDTH
        : console_.width;
      dragStartTree.current = tree.collapsed ? COLLAPSE_WIDTH : tree.width;

      // Expand on drag if collapsed
      if (console_.collapsed) {
        setConsole((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
        dragStartConsole.current = MIN_WIDTH;
      }

      // Disable transitions during drag
      document
        .querySelectorAll<HTMLElement>(
          `.${CLS}__console-panel, .${CLS}__tree-panel`,
        )
        .forEach((el) => {
          el.style.transition = "none";
        });

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (dragging.current !== "console") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartConsole.current + delta;

        // Smart collapse: instant collapse during drag
        if (newW < COLLAPSE_WIDTH) {
          setConsole((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartConsole.current,
          }));

          // Curtain propagation: transfer remaining delta to tree panel
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartTree.current;
          }

          if (propagating.current) {
            const propDelta = ev.clientX - propagateStartX.current;
            const propW = propagateStartWidth.current + propDelta;

            if (propW < COLLAPSE_WIDTH) {
              setTree((s) => ({
                ...s,
                collapsed: true,
                prevWidth: propagateStartWidth.current,
              }));
            } else {
              setTree((s) => ({
                ...s,
                collapsed: false,
                width: Math.min(propW, 500),
              }));
            }
          }
          return;
        }

        // Normal resize
        propagating.current = false;
        setConsole((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(600, newW)),
        }));
      };

      const onUp = () => {
        dragging.current = null;
        propagating.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document
          .querySelectorAll<HTMLElement>(
            `.${CLS}__console-panel, .${CLS}__tree-panel`,
          )
          .forEach((el) => {
            el.style.transition = "";
          });
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [console_, tree],
  );

  /** Start drag on tree resizer — propagates LEFT to console on collapse */
  const onTreeResizerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = "tree";
      propagating.current = false;
      dragStartX.current = e.clientX;
      dragStartTree.current = tree.collapsed ? COLLAPSE_WIDTH : tree.width;
      dragStartConsole.current = console_.collapsed
        ? COLLAPSE_WIDTH
        : console_.width;

      if (tree.collapsed) {
        setTree((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
        dragStartTree.current = MIN_WIDTH;
      }

      document
        .querySelectorAll<HTMLElement>(
          `.${CLS}__console-panel, .${CLS}__tree-panel`,
        )
        .forEach((el) => {
          el.style.transition = "none";
        });

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (dragging.current !== "tree") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartTree.current + delta;

        // Smart collapse + propagation to console (left)
        if (newW < COLLAPSE_WIDTH) {
          setTree((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartTree.current,
          }));

          // Curtain propagation: transfer remaining delta to console panel
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartConsole.current;
          }

          if (propagating.current) {
            const propDelta = ev.clientX - propagateStartX.current;
            const propW = propagateStartWidth.current + propDelta;

            if (propW < COLLAPSE_WIDTH) {
              setConsole((s) => ({
                ...s,
                collapsed: true,
                prevWidth: propagateStartWidth.current,
              }));
            } else {
              setConsole((s) => ({
                ...s,
                collapsed: false,
                width: Math.max(MIN_WIDTH, Math.min(600, propW)),
              }));
            }
          }
          return;
        }

        // Normal resize
        propagating.current = false;
        setTree((s) => ({
          ...s,
          collapsed: false,
          width: Math.max(MIN_WIDTH, Math.min(500, newW)),
        }));
      };

      const onUp = () => {
        dragging.current = null;
        propagating.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document
          .querySelectorAll<HTMLElement>(
            `.${CLS}__console-panel, .${CLS}__tree-panel`,
          )
          .forEach((el) => {
            el.style.transition = "";
          });
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [tree, console_],
  );

  const expandConsole = useCallback(() => {
    setConsole((s) => ({
      ...s,
      collapsed: false,
      width: s.prevWidth > COLLAPSE_WIDTH ? s.prevWidth : 300,
    }));
  }, []);

  const expandTree = useCallback(() => {
    setTree((s) => ({
      ...s,
      collapsed: false,
      width: s.prevWidth > COLLAPSE_WIDTH ? s.prevWidth : 250,
    }));
  }, []);

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

  const consoleWidth = console_.collapsed ? COLLAPSE_WIDTH : console_.width;
  const treeWidth = tree.collapsed ? COLLAPSE_WIDTH : tree.width;

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={style}
      data-app={appName}
    >
      <div className={`${CLS}__columns`}>
        {/* ── Column 1: Console/Chat Panel ──────────────────────── */}
        <div
          className={`${CLS}__console-panel${console_.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: consoleWidth }}
          onClick={console_.collapsed ? expandConsole : undefined}
        >
          {console_.collapsed ? (
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
              {/* Status inside console panel */}
              <div className={`${CLS}__console-status`}>
                <i
                  className="fas fa-circle"
                  style={{ fontSize: 8, color: "var(--status-success)" }}
                />{" "}
                Connected
              </div>
            </>
          )}
        </div>
        <div
          className={`${CLS}__resizer ${CLS}__resizer--vertical`}
          onMouseDown={onConsoleResizerDown}
        />

        {/* ── Column 2: File Tree Panel ─────────────────────────── */}
        <div
          className={`${CLS}__tree-panel${tree.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: treeWidth }}
          onClick={tree.collapsed ? expandTree : undefined}
        >
          {tree.collapsed ? (
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
                onContextAction={onFileContextAction}
                showFileCount
                showImageBadge
                searchable
              />
            </>
          )}
        </div>
        <div
          className={`${CLS}__resizer ${CLS}__resizer--vertical`}
          onMouseDown={onTreeResizerDown}
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

      {/* Status bar removed — "Connected" is now inside console panel */}
    </div>
  );
};
