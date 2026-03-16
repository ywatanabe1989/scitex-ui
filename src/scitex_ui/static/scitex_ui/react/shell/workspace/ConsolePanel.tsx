/**
 * ConsolePanel — Console/Chat panel for the Workspace shell.
 * Extracted from Workspace.tsx to keep file sizes manageable.
 */

import React, { useState } from "react";
import type { ChatBackend, TerminalBackend } from "./types";
import { Chat } from "../chat";
import { Terminal } from "../terminal";

const CLS = "stx-workspace";
type ConsoleMode = "console" | "chat";

export interface ConsolePanelProps {
  appName: string;
  collapsed: boolean;
  width: number;
  onCollapse: () => void;
  onExpand: () => void;
  chatBackend?: ChatBackend;
  terminalBackend?: TerminalBackend;
  voiceRecorder: {
    toggle: () => void;
    isRecording: boolean;
  };
  onShowCamera: () => void;
  onShowSketch: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  appName,
  collapsed,
  width,
  onCollapse,
  onExpand,
  chatBackend,
  terminalBackend,
  voiceRecorder,
  onShowCamera,
  onShowSketch,
}) => {
  const [mode, setMode] = useState<ConsoleMode>("console");

  if (collapsed) {
    return (
      <div
        className={`${CLS}__console-panel ${CLS}__panel--collapsed`}
        style={{ width }}
        onClick={onExpand}
      >
        <div className={`${CLS}__collapsed-label`}>
          <i className="fas fa-terminal" />
          <span>Console</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CLS}__console-panel`} style={{ width }}>
      <div className="stx-shell-ai-panel-header" onDoubleClick={onCollapse}>
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
              onCameraClick={onShowCamera}
              onSketchClick={onShowSketch}
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
                <span className="stx-shell-ai-console-tab-title">T1</span>
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
                onClick={onShowCamera}
              >
                <i className="fas fa-camera" />
              </button>
              <button
                className="stx-shell-ai-input-btn"
                title="Draw sketch"
                onClick={onShowSketch}
              >
                <i className="fas fa-pen" />
              </button>
              <button
                className={`stx-shell-ai-input-btn${voiceRecorder.isRecording ? " recording" : ""}`}
                title={
                  voiceRecorder.isRecording ? "Stop recording" : "Voice input"
                }
                onClick={voiceRecorder.toggle}
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
    </div>
  );
};
