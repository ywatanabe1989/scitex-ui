/**
 * Shell components — workspace chrome (theme, layout, status).
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
