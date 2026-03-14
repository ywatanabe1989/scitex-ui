/**
 * Type definitions for the FileBrowser component.
 */

import type { BaseComponentConfig } from "../../_base/types";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface FileBrowserConfig extends BaseComponentConfig {
  /** API endpoint to fetch file tree (optional — use setData instead) */
  apiUrl?: string;
  /** Called when user clicks a file */
  onFileSelect?: (node: FileNode) => void;
  /** Called when user toggles a directory */
  onDirectoryToggle?: (node: FileNode, expanded: boolean) => void;
  /** File extensions to show (e.g. [".py", ".ts"]) — null shows all */
  extensions?: string[] | null;
  /** Show hidden files (default: false) */
  showHidden?: boolean;
}
