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
import { RecentPane } from "../../app/recent-pane/RecentPane";
import { ConsolePanel } from "./ConsolePanel";
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
import { ModuleTabBar } from "./ModuleTabBar";

const CLS = "stx-workspace";

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
  recentEntries,
  onRecentEntryClick,
  children,
  modules,
  activeModule,
  onModuleChange,
  className,
  style,
}) => {
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
  const [recentCollapsed, setRecentCollapsed] = useState(() => {
    return localStorage.getItem(`${appName}-recent-collapsed`) === "true";
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

  // Listen for app-level resize overflow → cascade to shell panels
  useEffect(() => {
    const handler = (e: Event) => {
      const { direction, delta } = (e as CustomEvent).detail;
      if (direction === "left") {
        // App's left panel overflowed → shrink viewer, then tree, then console
        setViewer((s) => {
          const newW = s.width - delta;
          if (newW < COLLAPSE_WIDTH)
            return { ...s, collapsed: true, prevWidth: s.width };
          return { ...s, width: Math.max(COLLAPSE_WIDTH, newW) };
        });
      }
    };
    window.addEventListener("stx-app-resize-overflow", handler);
    return () => window.removeEventListener("stx-app-resize-overflow", handler);
  }, [setViewer]);

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

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={style}
      data-app={appName}
    >
      <div className={`${CLS}__columns`}>
        {/* ── Console/Chat Panel ──────────── */}
        <ConsolePanel
          appName={appName}
          collapsed={console_.collapsed}
          width={cW}
          onCollapse={() =>
            setConsole((s) => ({
              ...s,
              collapsed: true,
              prevWidth: s.width,
            }))
          }
          onExpand={expandConsole}
          chatBackend={chatBackend}
          terminalBackend={terminalBackend}
          voiceRecorder={voiceRecorder}
          onShowCamera={() => setShowCamera(true)}
          onShowSketch={() => setShowSketch(true)}
        />
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
              {recentEntries && (
                <RecentPane
                  entries={recentEntries}
                  collapsed={recentCollapsed}
                  onToggleCollapse={() => {
                    setRecentCollapsed((prev) => {
                      const next = !prev;
                      localStorage.setItem(
                        `${appName}-recent-collapsed`,
                        String(next),
                      );
                      return next;
                    });
                  }}
                  onEntryClick={onRecentEntryClick}
                />
              )}
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

        {/* ── Module Tab Bar (multi-module mode) ── */}
        {modules && modules.length > 0 && (
          <ModuleTabBar
            modules={modules}
            activeModule={activeModule}
            onModuleChange={onModuleChange}
          />
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
