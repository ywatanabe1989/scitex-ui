/**
 * Shell components — workspace chrome (theme, layout, status, file tree).
 */
export { ThemeProvider } from "./theme-provider";
export type { Theme, ThemeProviderConfig } from "./theme-provider";

export { AppShell, Sidebar } from "./app-shell";
export type { AppShellConfig } from "./app-shell";

export { StatusBar } from "./status-bar";
export type {
  StatusBarConfig,
  StatusBarSection,
  StatusItem,
} from "./status-bar";

export { ShellFileTree } from "./file-tree";
export type { FileTreeAdapter, ShellFileTreeConfig } from "./file-tree";

export { ToolbarManager, KeyboardShortcuts } from "./toolbar";
export type {
  ToolbarCommand,
  CommandEventDetail,
  ButtonBinding,
  KeyShortcut,
  ToolbarConfig,
} from "./toolbar";
