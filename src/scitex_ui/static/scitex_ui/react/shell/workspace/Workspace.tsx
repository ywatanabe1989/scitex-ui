/**
 * Workspace — universal shell for all SciTeX apps.
 * Ported from scitex-cloud. Layout:
 *   Console/Chat | FileTree | Viewer | AppContent
 *
 * Console/Chat panel uses scitex-ai-* CSS classes matching scitex-cloud
 * global_ai_panel.html DOM structure exactly.
 */

import React, { useState, useEffect, useCallback } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";
import { Viewer } from "../viewer";
import { usePanelState, COLLAPSE_WIDTH } from "./usePanelState";
import { useResizers } from "./useResizers";

const CLS = "stx-workspace";
/** Mode matching scitex-cloud data-mode values */
type ConsoleMode = "console" | "chat";

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
  const [mode, setMode] = useState<ConsoleMode>("console");
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"name" | "mtime">(() => {
    return (
      (localStorage.getItem("scitex-file-sort-mode") as "name" | "mtime") ||
      "name"
    );
  });

  const [console_, setConsole] = usePanelState(`${appName}-console-width`, 380);
  const [tree, setTree] = usePanelState(`${appName}-tree-width`, 240);
  const [viewer, setViewer] = usePanelState(`${appName}-viewer-width`, 300);

  const { onConsoleResizerDown, onTreeResizerDown, onViewerResizerDown } =
    useResizers(console_, tree, viewer, setConsole, setTree, setViewer);

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
        {/* ── Console/Chat Panel (scitex-ai-* DOM) ──────────── */}
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
              {/* Header: mode toggle (Console | Chat) */}
              <div className="scitex-ai-panel-header">
                <div className="scitex-ai-mode-toggle">
                  <button
                    className={`scitex-ai-mode-btn${mode === "console" ? " active" : ""}`}
                    data-mode="console"
                    title="Terminal"
                    onClick={() => setMode("console")}
                  >
                    <i className="fas fa-terminal" />
                    Console
                  </button>
                  <button
                    className={`scitex-ai-mode-btn${mode === "chat" ? " active" : ""}`}
                    data-mode="chat"
                    title="AI Chat"
                    onClick={() => setMode("chat")}
                  >
                    <i className="fas fa-robot" />
                    Chat
                  </button>
                </div>
              </div>

              {/* Body: views toggled by mode */}
              <div className="scitex-ai-body">
                {/* ── Chat view ────────────────────────────── */}
                <div
                  id="scitex-ai-chat-view"
                  className={`scitex-ai-view${mode === "chat" ? " active" : ""}`}
                >
                  {chatBackend ? (
                    <Chat
                      backend={chatBackend}
                      storageKey={`${appName}-chat-messages`}
                    />
                  ) : (
                    <div className={`${CLS}__placeholder`}>
                      <i className="fas fa-comment" />
                      <p>No chat backend</p>
                    </div>
                  )}
                </div>

                {/* ── Console/Terminal view ─────────────────── */}
                <div
                  id="scitex-ai-console-view"
                  className={`scitex-ai-view${mode === "console" ? " active" : ""}`}
                  data-view="console"
                >
                  {/* Console tabs bar */}
                  <div className="scitex-ai-console-tabs-bar">
                    <button
                      className="scitex-ai-console-new-tab"
                      title="New terminal"
                    >
                      <i className="fas fa-plus" />
                    </button>
                    <div
                      id="scitex-ai-console-tabs-list"
                      className="scitex-ai-console-tabs-list"
                    />
                  </div>

                  {/* Terminal content */}
                  <div
                    id="scitex-ai-console-terminal"
                    className="scitex-ai-console-terminal"
                  >
                    {terminalBackend ? (
                      <Terminal backend={terminalBackend} />
                    ) : (
                      <div className={`${CLS}__placeholder`}>
                        <i className="fas fa-terminal" />
                        <p>No terminal backend</p>
                      </div>
                    )}
                  </div>

                  {/* Console toolbar */}
                  <div
                    className="scitex-ai-console-toolbar"
                    style={{ position: "relative" }}
                  >
                    <span
                      id="scitex-ai-console-status"
                      className="scitex-ai-console-status"
                    />
                    <div className="scitex-ai-console-toolbar-btns">
                      {/* Auto-accept toggle */}
                      <button
                        id="scitex-ai-auto-accept"
                        className="scitex-ai-input-btn scitex-ai-auto-accept-btn"
                        title="Auto-Accept"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-robot" />
                      </button>
                      {/* Camera — placeholder */}
                      <button
                        id="scitex-ai-console-camera"
                        className="scitex-ai-input-btn"
                        title="Webcam capture"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-camera" />
                      </button>
                      {/* Sketch — placeholder */}
                      <button
                        id="scitex-ai-console-sketch"
                        className="scitex-ai-input-btn"
                        title="Draw sketch"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      {/* Mic — placeholder */}
                      <button
                        id="scitex-ai-console-mic"
                        className="scitex-ai-input-btn"
                        title="Voice input"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-microphone" />
                      </button>
                      {/* Gear / settings — placeholder */}
                      <button
                        id="scitex-ai-console-gear"
                        className="scitex-ai-input-btn scitex-ai-gear-btn"
                        title="Console settings"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-cog" />
                      </button>
                    </div>
                  </div>
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
              <div className="stx-shell-sidebar__header">
                <span className="stx-shell-sidebar__title">Files</span>
                <div className="stx-shell-sidebar__header-actions">
                  <button
                    className={`sort-toggle${sortMode === "mtime" ? " active" : ""}`}
                    title={
                      sortMode === "mtime"
                        ? "Sort by name (A-Z)"
                        : "Sort by recent (newest first)"
                    }
                    onClick={() => {
                      const next = sortMode === "name" ? "mtime" : "name";
                      setSortMode(next);
                      localStorage.setItem("scitex-file-sort-mode", next);
                    }}
                  >
                    <i
                      className={
                        sortMode === "mtime"
                          ? "fas fa-clock"
                          : "fas fa-sort-alpha-down"
                      }
                    />
                  </button>
                </div>
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
                sortMode={sortMode}
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
