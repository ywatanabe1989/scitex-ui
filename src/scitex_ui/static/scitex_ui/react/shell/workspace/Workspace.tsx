/**
 * Workspace — universal shell for all SciTeX apps.
 * Ported from scitex-cloud. Layout:
 *   Console/Chat | FileTree | Viewer | AppContent
 *
 * Console/Chat panel uses stx-shell-ai-* CSS classes matching scitex-cloud
 * global_ai_panel.html DOM structure exactly.
 */

import React, { useState, useEffect, useRef } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";
import { Viewer } from "../viewer";
import { usePanelState, COLLAPSE_WIDTH } from "./usePanelState";
import { useResizers } from "./useResizers";
import { useVoiceRecorder } from "../media-input/useVoiceRecorder";
import { WebcamCapture } from "../media-input/WebcamCapture";
import { SketchCanvas } from "../media-input/SketchCanvas";
import { bootstrapContextZoom } from "../../../ts/utils/context-zoom";
import { WorkspaceResizeProvider } from "./WorkspaceResizeContext";
import { useShellPanes } from "./useShellPanes";
import { useExpandCallbacks } from "./useExpandCallbacks";

const CLS = "stx-workspace";
type ConsoleMode = "console" | "chat";

export const Workspace: React.FC<WorkspaceProps> = ({
  appName,
  accentColor,
  terminalBackend,
  chatBackend,
  fileTreeBackend,
  highlightExtensions: _highlightExtensions,
  onFileSelect,
  onFileDoubleClick,
  onFileDrop,
  onFileContextAction,
  getFileUrl,
  sttUrl,
  onImageCapture,
  onVoiceTranscript,
  children,
  className,
  style,
}) => {
  const [mode, setMode] = useState<ConsoleMode>("console");
  const [showCamera, setShowCamera] = useState(false);
  const [showSketch, setShowSketch] = useState(false);
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"name" | "mtime">(() => {
    return (
      (localStorage.getItem("scitex-file-sort-mode") as "name" | "mtime") ||
      "name"
    );
  });

  const voiceRecorder = useVoiceRecorder({
    onTranscript: (text) => onVoiceTranscript?.(text),
    sttUrl,
  });

  const [console_, setConsole] = usePanelState(`${appName}-console-width`, 380);
  const [tree, setTree] = usePanelState(`${appName}-tree-width`, 240);
  const [viewer, setViewer] = usePanelState(`${appName}-viewer-width`, 300);

  const { onConsoleResizerDown, onTreeResizerDown, onViewerResizerDown } =
    useResizers(console_, tree, viewer, setConsole, setTree, setViewer);

  const shellPanesRef = useShellPanes(
    console_,
    tree,
    viewer,
    setConsole,
    setTree,
    setViewer,
  );

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

  // Auto-register context-zoom zones for all shell-owned panes.
  // Any app using <Workspace> gets per-pane zoom for free.
  const zoomInitialized = useRef(false);
  useEffect(() => {
    if (zoomInitialized.current) return;
    zoomInitialized.current = true;
    bootstrapContextZoom(
      [
        // Chat/AI pane — CSS zoom
        {
          selector: ".stx-shell-ai-view",
          storageKey: `${appName}-chat-zoom`,
          min: 0.7,
          max: 1.6,
        },
        // Viewer pane — CSS zoom
        {
          selector: `.${CLS}__viewer-panel`,
          storageKey: `${appName}-viewer-zoom`,
          min: 0.7,
          max: 1.6,
        },
      ],
      [
        // Terminal pane — font-size zoom
        {
          selector: ".stx-shell-ai-console-terminal",
          storageKey: `${appName}-terminal-font-size`,
          defaultSize: 13,
          min: 8,
          max: 24,
          group: "terminal",
        },
        // File tree — font-size zoom on item names
        {
          selector: ".stx-app-file-tree",
          storageKey: `${appName}-filetree-font-size`,
          defaultSize: 13,
          min: 9,
          max: 20,
          target: ".stx-app-file-tree__name",
        },
      ],
    );
  }, [appName]);

  useEffect(() => {
    if (fileTreeBackend) {
      fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      fileTreeBackend.onTreeChange?.(() => {
        fileTreeBackend.fetchTree().then(setTreeData).catch(console.error);
      });
    }
  }, [fileTreeBackend]);

  const {
    expandConsole,
    expandTree,
    expandViewer,
    handleDrop,
    handleDragOver,
  } = useExpandCallbacks(setConsole, setTree, setViewer, onFileDrop);

  const cW = console_.collapsed ? COLLAPSE_WIDTH : console_.width;
  const tW = tree.collapsed ? COLLAPSE_WIDTH : tree.width;
  const vW = viewer.collapsed ? COLLAPSE_WIDTH : viewer.width;
  // Media buttons always enabled — modals/recorder work standalone
  const mediaEnabled = true;
  const micEnabled = true;

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={style}
      data-app={appName}
    >
      <div className={`${CLS}__columns`}>
        {/* ── Console/Chat Panel ──────────── */}
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
              <div
                className="stx-shell-ai-panel-header"
                onDoubleClick={() =>
                  setConsole((s) => ({
                    ...s,
                    collapsed: true,
                    prevWidth: s.width,
                  }))
                }
              >
                <div className="stx-shell-ai-mode-toggle">
                  <button
                    className={`stx-shell-ai-mode-btn${mode === "console" ? " active" : ""}`}
                    data-mode="console"
                    title="Terminal"
                    onClick={() => setMode("console")}
                  >
                    <i className="fas fa-terminal" /> Console
                  </button>
                  <button
                    className={`stx-shell-ai-mode-btn${mode === "chat" ? " active" : ""}`}
                    data-mode="chat"
                    title="AI Chat"
                    onClick={() => setMode("chat")}
                  >
                    <i className="fas fa-robot" /> Chat
                  </button>
                </div>
              </div>

              <div className="stx-shell-ai-body">
                <div
                  id="stx-shell-ai-chat-view"
                  className={`stx-shell-ai-view${mode === "chat" ? " active" : ""}`}
                >
                  {chatBackend ? (
                    <Chat
                      backend={chatBackend}
                      storageKey={`${appName}-chat-messages`}
                      onCameraClick={() => setShowCamera(true)}
                      onSketchClick={() => setShowSketch(true)}
                      onMicClick={voiceRecorder.toggle}
                      micRecording={voiceRecorder.isRecording}
                    />
                  ) : (
                    <div className={`${CLS}__placeholder`}>
                      <i className="fas fa-comment" />
                      <p>No chat backend</p>
                    </div>
                  )}
                </div>

                <div
                  id="stx-shell-ai-console-view"
                  className={`stx-shell-ai-view${mode === "console" ? " active" : ""}`}
                  data-view="console"
                >
                  <div className="stx-shell-ai-console-tabs-bar">
                    <button
                      className="stx-shell-ai-console-new-tab"
                      title="New terminal"
                    >
                      <i className="fas fa-plus" />
                    </button>
                    <div
                      id="stx-shell-ai-console-tabs-list"
                      className="stx-shell-ai-console-tabs-list"
                    >
                      <div className="stx-shell-ai-console-tab-item active">
                        <span className="stx-shell-ai-console-tab-title">
                          T1
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    id="stx-shell-ai-console-terminal"
                    className="stx-shell-ai-console-terminal"
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

                  <div
                    className="stx-shell-ai-console-toolbar"
                    style={{ position: "relative" }}
                  >
                    <span
                      id="stx-shell-ai-console-status"
                      className="stx-shell-ai-console-status"
                    />
                    <div className="stx-shell-ai-console-toolbar-btns">
                      <button
                        className="stx-shell-ai-input-btn stx-shell-ai-auto-accept-btn"
                        title="Auto-Accept"
                        disabled
                        aria-disabled="true"
                      >
                        <i className="fas fa-robot" />
                      </button>
                      <button
                        className="stx-shell-ai-input-btn"
                        title="Webcam capture"
                        onClick={() => setShowCamera(true)}
                        disabled={!mediaEnabled}
                      >
                        <i className="fas fa-camera" />
                      </button>
                      <button
                        className="stx-shell-ai-input-btn"
                        title="Draw sketch"
                        onClick={() => setShowSketch(true)}
                        disabled={!mediaEnabled}
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        className={`stx-shell-ai-input-btn${voiceRecorder.isRecording ? " recording" : ""}`}
                        title={
                          voiceRecorder.isRecording
                            ? "Stop recording"
                            : "Voice input"
                        }
                        onClick={voiceRecorder.toggle}
                        disabled={!micEnabled}
                      >
                        <i
                          className={`fas fa-microphone${voiceRecorder.isRecording ? "-slash" : ""}`}
                        />
                      </button>
                      <button
                        className="stx-shell-ai-input-btn stx-shell-ai-gear-btn"
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

        {/* ── File Tree ───────────────────── */}
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
              <div
                className="stx-shell-sidebar__header"
                onDoubleClick={() =>
                  setTree((s) => ({
                    ...s,
                    collapsed: true,
                    prevWidth: s.width,
                  }))
                }
              >
                <span className="stx-shell-sidebar__title">Files</span>
                <div className="stx-shell-sidebar__header-actions">
                  <button
                    className={`stx-shell-sort-toggle${sortMode === "mtime" ? " active" : ""}`}
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
                onFileDoubleClick={(node) => {
                  if (node.type === "file") {
                    if (viewerFile === node.path && !viewer.collapsed) {
                      // Same file double-clicked again → collapse viewer
                      setViewer((s) => ({
                        ...s,
                        collapsed: true,
                        prevWidth: s.width,
                      }));
                    } else {
                      setViewerFile(node.path);
                      if (viewer.collapsed) expandViewer();
                    }
                  }
                  onFileDoubleClick?.(node);
                }}
                onContextAction={onFileContextAction}
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

        {/* ── Viewer ───────────────────────── */}
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

        {/* ── App Content (resize context for cross-boundary propagation) */}
        <WorkspaceResizeProvider shellPanes={shellPanesRef}>
          <div
            className={`${CLS}__app-content`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {children}
          </div>
        </WorkspaceResizeProvider>
      </div>

      {/* ── Media Input Modals ──────────── */}
      {onImageCapture && (
        <>
          <WebcamCapture
            open={showCamera}
            onClose={() => setShowCamera(false)}
            onCapture={onImageCapture}
          />
          <SketchCanvas
            open={showSketch}
            onClose={() => setShowSketch(false)}
            onDone={onImageCapture}
          />
        </>
      )}
    </div>
  );
};
