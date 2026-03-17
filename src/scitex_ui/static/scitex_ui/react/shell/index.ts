// Shell components (React)
export { Workspace } from "./workspace";
export type {
  WorkspaceProps,
  TerminalBackend,
  ChatBackend,
  ChatChunk,
  ChatMessage,
  FileTreeBackend,
} from "./workspace";

export { Terminal } from "./terminal";
export type { TerminalProps } from "./terminal";

export { Chat } from "./chat";
export type { ChatProps } from "./chat";

export { AppSandbox } from "./app-sandbox";
export type {
  AppSandboxProps,
  AppMountConfig,
  AppMountFunction,
  AppUnmountFunction,
} from "./app-sandbox";
