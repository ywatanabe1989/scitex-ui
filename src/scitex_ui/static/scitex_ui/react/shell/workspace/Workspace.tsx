/**
 * Workspace — universal shell for all SciTeX apps.
 * Ported from scitex-cloud. Layout:
 *   Console/Chat | FileTree | Viewer | AppContent
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";
import { Viewer } from "../viewer";
import { usePanelState, COLLAPSE_WIDTH, MIN_WIDTH } from "./usePanelState";

const CLS = "stx-workspace";
type ConsoleTab = "console" | "chat";

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
  getFileUrl,
  children,
  className,
  style,
}) => {
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("console");
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [viewerFile, setViewerFile] = useState<string | null>(null);

  const [console_, setConsole] = usePanelState(`${appName}-console-width`, 380);
  const [tree, setTree] = usePanelState(`${appName}-tree-width`, 240);
  const [viewer, setViewer] = usePanelState(`${appName}-viewer-width`, 300);

  // Dragging refs for curtain propagation
  const dragging = useRef<string | null>(null);
  const dragStartX = useRef(0);
  const dragStartConsole = useRef(0);
  const dragStartTree = useRef(0);
  const propagating = useRef(false);
  const propagateStartX = useRef(0);
  const propagateStartWidth = useRef(0);

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

  useEffect(() => {
    if (fileTreeBackend) {
      fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      fileTreeBackend.onTreeChange?.(() => {
        fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      });
    }
  }, [fileTreeBackend]);

  const disableTransitions = () => {
    document
      .querySelectorAll<HTMLElement>(
        `.${CLS}__console-panel, .${CLS}__tree-panel`,
      )
      .forEach((el) => {
        el.style.transition = "none";
      });
  };
  const enableTransitions = () => {
    document
      .querySelectorAll<HTMLElement>(
        `.${CLS}__console-panel, .${CLS}__tree-panel`,
      )
      .forEach((el) => {
        el.style.transition = "";
      });
  };

  /** Console resizer — propagates RIGHT to tree */
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
      if (console_.collapsed) {
        setConsole((s) => ({ ...s, collapsed: false, width: MIN_WIDTH }));
        dragStartConsole.current = MIN_WIDTH;
      }
      disableTransitions();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (dragging.current !== "console") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartConsole.current + delta;
        if (newW < COLLAPSE_WIDTH) {
          setConsole((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartConsole.current,
          }));
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartTree.current;
          }
          if (propagating.current) {
            const propW =
              propagateStartWidth.current +
              (ev.clientX - propagateStartX.current);
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
        enableTransitions();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [console_, tree, setConsole, setTree],
  );

  /** Tree resizer — propagates LEFT to console */
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
      disableTransitions();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (dragging.current !== "tree") return;
        const delta = ev.clientX - dragStartX.current;
        const newW = dragStartTree.current + delta;
        if (newW < COLLAPSE_WIDTH) {
          setTree((s) => ({
            ...s,
            collapsed: true,
            prevWidth: dragStartTree.current,
          }));
          if (!propagating.current) {
            propagating.current = true;
            propagateStartX.current = ev.clientX;
            propagateStartWidth.current = dragStartConsole.current;
          }
          if (propagating.current) {
            const propW =
              propagateStartWidth.current +
              (ev.clientX - propagateStartX.current);
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
        enableTransitions();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [tree, console_, setTree, setConsole],
  );

  /** Simple resizer for viewer panel */
  const onViewerResizerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = viewer.collapsed ? COLLAPSE_WIDTH : viewer.width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const onMove = (ev: MouseEvent) => {
        const newW = startW + (ev.clientX - startX);
        if (newW < COLLAPSE_WIDTH) {
          setViewer((s) => ({ ...s, collapsed: true, prevWidth: startW }));
        } else {
          setViewer((s) => ({
            ...s,
            collapsed: false,
            width: Math.max(MIN_WIDTH, Math.min(600, newW)),
          }));
        }
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [viewer, setViewer],
  );

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

  const cW = console_.collapsed ? COLLAPSE_WIDTH : console_.width;
  const tW = tree.collapsed ? COLLAPSE_WIDTH : tree.width;
  const vW = viewer.collapsed ? COLLAPSE_WIDTH : viewer.width;

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={style}
      data-app={appName}
    >
      <div className={`${CLS}__columns`}>
        {/* ── Console/Chat ────────────────────────────────── */}
        <div
          className={`${CLS}__console-panel${console_.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: cW }}
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
                <div style={{ flex: 1 }} />
                <button
                  className={`${CLS}__console-status-btn`}
                  title="Layout"
                  style={{ marginRight: 4 }}
                >
                  <i className="fas fa-th" />
                </button>
              </div>
              {/* Terminal session tabs (matching scitex-cloud) */}
              {consoleTab === "console" && (
                <div className={`${CLS}__terminal-tabs`}>
                  <button
                    className={`${CLS}__terminal-tab-new`}
                    title="New terminal"
                  >
                    +
                  </button>
                  <button
                    className={`${CLS}__terminal-tab ${CLS}__terminal-tab--active`}
                  >
                    T1
                  </button>
                </div>
              )}
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
              <div className={`${CLS}__console-status`}>
                <i
                  className="fas fa-circle"
                  style={{ fontSize: 8, color: "var(--status-success)" }}
                />{" "}
                Connected
                <div className={`${CLS}__console-status-actions`}>
                  <button
                    className={`${CLS}__console-status-btn`}
                    title="Terminal"
                  >
                    <i className="fas fa-terminal" />
                  </button>
                  <button
                    className={`${CLS}__console-status-btn`}
                    title="Microphone"
                  >
                    <i className="fas fa-microphone" />
                  </button>
                  <button className={`${CLS}__console-status-btn`} title="Edit">
                    <i className="fas fa-pen" />
                  </button>
                  <button
                    className={`${CLS}__console-status-btn`}
                    title="Settings"
                  >
                    <i className="fas fa-gear" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div
          className={`${CLS}__resizer ${CLS}__resizer--vertical`}
          onMouseDown={onConsoleResizerDown}
        />

        {/* ── File Tree ───────────────────────────────────── */}
        <div
          className={`${CLS}__tree-panel${tree.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
          style={{ width: tW }}
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
                onFileSelect={(node) => {
                  setViewerFile(node.path);
                  onFileSelect?.(node);
                }}
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

        {/* ── Viewer (file preview) ───────────────────────── */}
        {getFileUrl && (
          <>
            <div
              className={`${CLS}__viewer-panel${viewer.collapsed ? ` ${CLS}__panel--collapsed` : ""}`}
              style={{ width: vW }}
              onClick={viewer.collapsed ? expandViewer : undefined}
            >
              {viewer.collapsed ? (
                <div className={`${CLS}__collapsed-label`}>
                  <i className="fas fa-eye" />
                  <span>Viewer</span>
                </div>
              ) : (
                <Viewer
                  filePath={viewerFile}
                  getFileUrl={getFileUrl}
                  onClose={() =>
                    setViewer((s) => ({
                      ...s,
                      collapsed: true,
                      prevWidth: s.width,
                    }))
                  }
                />
              )}
            </div>
            <div
              className={`${CLS}__resizer ${CLS}__resizer--vertical`}
              onMouseDown={onViewerResizerDown}
            />
          </>
        )}

        {/* ── App Content ─────────────────────────────────── */}
        <div
          className={`${CLS}__app-content`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
