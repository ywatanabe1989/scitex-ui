/**
 * Workspace — universal shell for all SciTeX apps.
 *
 * Layout: Console/Chat (left) | File Tree (mid) | App Content (right)
 *
 * The Console panel has two tabs: Console (terminal) and Chat (AI).
 * No top navbar in standalone mode. App selector only in cloud mode.
 *
 * Usage:
 *   <Workspace appName="figrecipe" terminalBackend={...} fileTreeBackend={...}>
 *     <MyAppContent />
 *   </Workspace>
 */

import React, { useState, useEffect, useCallback } from "react";
import type { WorkspaceProps } from "./types";
import type { FileNode } from "../../app/file-browser/types";
import { FileBrowser } from "../../app/file-browser";
import { Chat } from "../chat";
import { Terminal } from "../terminal";

const CLS = "stx-workspace";

type ConsoleTab = "console" | "chat";

export const Workspace: React.FC<WorkspaceProps> = ({
  appName,
  accentColor,
  terminalBackend,
  chatBackend,
  fileTreeBackend,
  highlightExtensions,
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

  const hasConsole = !!(terminalBackend || chatBackend);

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
      {/* ── Column 1: Console/Chat Panel ──────────────────────── */}
      {hasConsole && (
        <>
          <div
            className={`${CLS}__console-panel${consoleCollapsed ? ` ${CLS}__console-panel--collapsed` : ""}`}
          >
            {consoleCollapsed ? (
              <div className={`${CLS}__console-collapsed`}>
                {terminalBackend && (
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
                )}
                {chatBackend && (
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
                )}
              </div>
            ) : (
              <>
                {/* Tab bar */}
                <div className={`${CLS}__console-tabs`}>
                  {terminalBackend && (
                    <button
                      className={`${CLS}__console-tab${consoleTab === "console" ? ` ${CLS}__console-tab--active` : ""}`}
                      onClick={() => setConsoleTab("console")}
                    >
                      <i className="fas fa-terminal" /> Console
                    </button>
                  )}
                  {chatBackend && (
                    <button
                      className={`${CLS}__console-tab${consoleTab === "chat" ? ` ${CLS}__console-tab--active` : ""}`}
                      onClick={() => setConsoleTab("chat")}
                    >
                      <i className="fas fa-comment" /> Chat
                    </button>
                  )}
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
                  {consoleTab === "console" && terminalBackend && (
                    <Terminal backend={terminalBackend} />
                  )}
                  {consoleTab === "chat" && chatBackend && (
                    <Chat
                      backend={chatBackend}
                      storageKey={`${appName}-chat-messages`}
                    />
                  )}
                </div>
              </>
            )}
          </div>
          <div className={`${CLS}__resizer ${CLS}__resizer--vertical`} />
        </>
      )}

      {/* ── Column 2: File Tree Panel ─────────────────────────── */}
      {fileTreeBackend && (
        <>
          <div
            className={`${CLS}__tree-panel${treeCollapsed ? ` ${CLS}__tree-panel--collapsed` : ""}`}
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
          <div className={`${CLS}__resizer ${CLS}__resizer--vertical`} />
        </>
      )}

      {/* ── Column 3: App Content ─────────────────────────────── */}
      <div
        className={`${CLS}__app-content`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {children}
      </div>

      {/* ── Status Bar ────────────────────────────────────────── */}
      <div className={`${CLS}__status-bar`}>
        <span className={`${CLS}__status-item`}>
          <i
            className="fas fa-circle"
            style={{ fontSize: 8, color: "#a6e3a1" }}
          />{" "}
          Connected
        </span>
        <div style={{ flex: 1 }} />
        <span className={`${CLS}__status-item`}>{appName}</span>
      </div>
    </div>
  );
};
