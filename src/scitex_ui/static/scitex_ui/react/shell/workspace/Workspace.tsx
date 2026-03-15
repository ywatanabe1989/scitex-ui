/**
 * Workspace — universal shell for all SciTeX apps.
 *
 * Provides: AI chat (left), file tree (middle), app content (right),
 * terminal (bottom). All panels are optional and resizable.
 *
 * Usage:
 *   import { Workspace } from '@scitex/ui/react/shell/workspace';
 *   <Workspace
 *     appName="figrecipe"
 *     terminalBackend={localBackend}
 *     chatBackend={directBackend}
 *     fileTreeBackend={localFileTree}
 *     onFileSelect={(node) => loadRecipe(node.path)}
 *   >
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
  const [chatCollapsed, setChatCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`${appName}-chat-collapsed`) === "true";
    } catch {
      return false;
    }
  });
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [treeData, setTreeData] = useState<FileNode[]>([]);

  // Set accent color CSS variable
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

  // Persist chat collapse state
  useEffect(() => {
    try {
      localStorage.setItem(`${appName}-chat-collapsed`, String(chatCollapsed));
    } catch {
      /* noop */
    }
  }, [appName, chatCollapsed]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const path = e.dataTransfer.getData("text/plain");
      if (path && onFileDrop) {
        onFileDrop(path, "app");
      }
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
      {/* AI Chat Panel (left) */}
      {chatBackend && (
        <>
          <div
            className={`${CLS}__chat-panel${chatCollapsed ? ` ${CLS}__chat-panel--collapsed` : ""}`}
          >
            {chatCollapsed ? (
              <button
                className={`${CLS}__panel-toggle`}
                onClick={() => setChatCollapsed(false)}
                title="Show AI Chat"
              >
                <i className="fas fa-robot" />
              </button>
            ) : (
              <>
                <button
                  className={`${CLS}__panel-collapse`}
                  onClick={() => setChatCollapsed(true)}
                  title="Hide AI Chat"
                >
                  <i className="fas fa-chevron-left" />
                </button>
                <Chat
                  backend={chatBackend}
                  storageKey={`${appName}-chat-messages`}
                />
              </>
            )}
          </div>
          <div className={`${CLS}__resizer ${CLS}__resizer--vertical`} />
        </>
      )}

      {/* File Tree Panel (middle) */}
      {fileTreeBackend && (
        <>
          <div
            className={`${CLS}__tree-panel${treeCollapsed ? ` ${CLS}__tree-panel--collapsed` : ""}`}
          >
            <div className={`${CLS}__tree-header`}>
              <i className="fas fa-folder" />
              <span>Files</span>
              <button
                className={`${CLS}__panel-collapse`}
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

      {/* Main Content Area */}
      <div className={`${CLS}__main`}>
        {/* App content */}
        <div
          className={`${CLS}__app-content`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {children}
        </div>

        {/* Terminal (bottom) */}
        {terminalBackend && (
          <>
            <div className={`${CLS}__resizer ${CLS}__resizer--horizontal`} />
            <div
              className={`${CLS}__terminal-panel${terminalCollapsed ? ` ${CLS}__terminal-panel--collapsed` : ""}`}
            >
              <div className={`${CLS}__terminal-header`}>
                <button
                  className={`${CLS}__terminal-toggle`}
                  onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                >
                  <i className="fas fa-terminal" />
                  <span>Terminal</span>
                  <i
                    className={`fas fa-chevron-${terminalCollapsed ? "up" : "down"}`}
                  />
                </button>
              </div>
              {!terminalCollapsed && <Terminal backend={terminalBackend} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
