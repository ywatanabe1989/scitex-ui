/**
 * Workspace — universal shell for all SciTeX apps.
 *
 * Layout: Console/Chat (left) | File Tree (mid) | App Content (right)
 *
 * The Console panel always has two tabs: Console (terminal) and Chat (AI).
 * No top navbar in standalone mode. App selector only in cloud mode.
 *
 * Usage:
 *   <Workspace appName="figrecipe" terminalBackend={...} fileTreeBackend={...}>
 *     <MyAppContent />
 *   </Workspace>
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";

const CLS = "stx-workspace";

type ConsoleTab = "console" | "chat";

/** Hook for drag-to-resize panels */
function useResizer(
  initialWidth: number,
  minWidth: number,
  maxWidth: number,
): {
  width: number;
  resizerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
} {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth.current + delta),
        );
        setWidth(newWidth);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, minWidth, maxWidth],
  );

  return { width, resizerProps: { onMouseDown } };
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
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [treeData, setTreeData] = useState<FileNode[]>([]);

  const consoleResizer = useResizer(300, 40, 600);
  const treeResizer = useResizer(250, 40, 500);

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
          className={`${CLS}__console-panel${consoleCollapsed ? ` ${CLS}__console-panel--collapsed` : ""}`}
          style={consoleCollapsed ? undefined : { width: consoleResizer.width }}
        >
          {consoleCollapsed ? (
            <div className={`${CLS}__console-collapsed`}>
              <button
                className={`${CLS}__collapsed-tab`}
                onClick={() => {
                  setConsoleCollapsed(false);
                  setConsoleTab("console");
                }}
                title="Console"
              >
                <i className="fas fa-terminal" />
              </button>
              <button
                className={`${CLS}__collapsed-tab`}
                onClick={() => {
                  setConsoleCollapsed(false);
                  setConsoleTab("chat");
                }}
                title="Chat"
              >
                <i className="fas fa-comment" />
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar — always show both tabs */}
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
                  className={`${CLS}__console-collapse`}
                  onClick={() => setConsoleCollapsed(true)}
                  title="Collapse"
                >
                  <i className="fas fa-chevron-left" />
                </button>
              </div>

              {/* Content */}
              <div className={`${CLS}__console-content`}>
                {consoleTab === "console" &&
                  (terminalBackend ? (
                    <Terminal backend={terminalBackend} />
                  ) : (
                    <div className={`${CLS}__placeholder`}>
                      <i className="fas fa-terminal" />
                      <p>No terminal backend configured</p>
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
                      <p>No chat backend configured</p>
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
          className={`${CLS}__tree-panel${treeCollapsed ? ` ${CLS}__tree-panel--collapsed` : ""}`}
          style={treeCollapsed ? undefined : { width: treeResizer.width }}
        >
          <div className={`${CLS}__tree-header`}>
            <i className="fas fa-folder" />
            <span>Files</span>
            <button
              className={`${CLS}__panel-btn`}
              onClick={() => setTreeCollapsed(!treeCollapsed)}
            >
              <i
                className={`fas fa-chevron-${treeCollapsed ? "right" : "left"}`}
              />
            </button>
          </div>
          {!treeCollapsed && (
            <FileBrowser
              data={treeData}
              onFileSelect={onFileSelect}
              showFileCount
              showImageBadge
            />
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
      {/* end __columns */}

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
