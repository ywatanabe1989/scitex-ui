/**
 * Type definitions for the Workspace Viewer — ported from scitex-cloud.
 * Original: static/shared/ts/components/workspace-viewer/types.ts
 */

import type { BaseProps } from "../../_base/types";

export type FileType =
  | "text"
  | "image"
  | "pdf"
  | "csv"
  | "mermaid"
  | "graphviz"
  | "audio"
  | "video"
  | "binary";

export const LANGUAGE_MAP: Record<string, string> = {
  ".py": "python",
  ".js": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".jsx": "javascript",
  ".html": "html",
  ".css": "css",
  ".json": "json",
  ".md": "markdown",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".sh": "shell",
  ".bash": "shell",
  ".r": "r",
  ".tex": "latex",
  ".bib": "bibtex",
  ".txt": "plaintext",
  ".xml": "xml",
  ".sql": "sql",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".rb": "ruby",
  ".toml": "toml",
  ".ini": "ini",
  ".cfg": "ini",
  ".csv": "plaintext",
  ".tsv": "plaintext",
};

export const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
]);
export const PDF_EXTENSIONS = new Set([".pdf"]);
export const CSV_EXTENSIONS = new Set([".csv", ".tsv"]);
export const MERMAID_EXTENSIONS = new Set([".mmd", ".mermaid"]);
export const GRAPHVIZ_EXTENSIONS = new Set([".dot", ".gv"]);
export const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".m4a",
  ".aac",
  ".wma",
]);
export const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".avi",
  ".mov",
  ".mkv",
  ".ogv",
]);
export const BINARY_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
]);

export function detectFileType(filePath: string): FileType {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (CSV_EXTENSIONS.has(ext)) return "csv";
  if (MERMAID_EXTENSIONS.has(ext)) return "mermaid";
  if (GRAPHVIZ_EXTENSIONS.has(ext)) return "graphviz";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (BINARY_EXTENSIONS.has(ext)) return "binary";
  return "text";
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

export interface ViewerProps extends BaseProps {
  filePath: string | null;
  getFileUrl: (path: string, raw?: boolean) => string;
  onClose?: () => void;
}
