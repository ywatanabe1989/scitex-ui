/**
 * Type definitions for the Workspace shell.
 * Universal frame for all SciTeX apps — standalone and cloud.
 */

import type { BaseProps } from "../../_base/types";
export type { FileNode } from "../../app/file-browser/types";
import type { FileNode } from "../../app/file-browser/types";

// ── Terminal Backend Protocol ────────────────────────────────────

export interface TerminalBackend {
  /** Connect to terminal with initial size */
  connect(config: { rows: number; cols: number }): void;
  /** Send input data to terminal */
  send(data: string): void;
  /** Resize terminal */
  resize(rows: number, cols: number): void;
  /** Register data handler (output from terminal) */
  onData(callback: (data: string) => void): void;
  /** Disconnect and cleanup */
  disconnect(): void;
}

// ── Chat Backend Protocol ────────────────────────────────────────

export interface ChatChunk {
  type: "text" | "tool_start" | "tool_result" | "done" | "error";
  text?: string;
  name?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatBackend {
  /** Send message and receive streamed response */
  sendMessage(
    prompt: string,
    context?: Record<string, unknown>,
  ): AsyncIterable<ChatChunk>;
}

// ── File Tree Backend Protocol ───────────────────────────────────

export interface FileTreeBackend {
  /** Fetch file tree */
  fetchTree(): Promise<FileNode[]>;
  /** Optional: watch for changes */
  onTreeChange?: (callback: () => void) => void;
}

// ── Workspace Props ──────────────────────────────────────────────

export interface WorkspaceProps extends BaseProps {
  /** App name (used for accent color, storage keys) */
  appName: string;
  /** App accent color (CSS hex) */
  accentColor?: string;

  /** Terminal backend (omit to hide terminal) */
  terminalBackend?: TerminalBackend;
  /** Chat backend (omit to hide chat panel) */
  chatBackend?: ChatBackend;
  /** File tree backend (omit to hide file tree) */
  fileTreeBackend?: FileTreeBackend;

  /** File extensions to highlight in tree */
  highlightExtensions?: string[];
  /** Called when file is selected (single click) in tree */
  onFileSelect?: (node: FileNode) => void;
  /** Called when file is double-clicked in tree (opens in viewer/editor) */
  onFileDoubleClick?: (node: FileNode) => void;
  /** Called when file is dropped onto app area */
  onFileDrop?: (path: string, target: string) => void;
  /** Called on file tree right-click action */
  onFileContextAction?: (
    action: "new" | "rename" | "delete" | "duplicate" | "copy-path",
    node: FileNode,
  ) => void;
  /** Build URL for file content (enables Viewer pane) */
  getFileUrl?: (path: string, raw?: boolean) => string;

  /** App content (rendered in main area) */
  children: React.ReactNode;
}
