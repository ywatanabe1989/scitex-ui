/**
 * Type definitions for the Workspace Viewer pane.
 * Ported from scitex-cloud's workspace-viewer.
 */

import type { BaseProps } from "../../_base/types";

/** Detected file type for routing to appropriate viewer */
export type ViewerFileType =
  | "image"
  | "text"
  | "pdf"
  | "csv"
  | "audio"
  | "video"
  | "binary";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
]);
const TEXT_EXT = new Set([
  ".py",
  ".js",
  ".ts",
  ".tsx",
  ".html",
  ".css",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".sh",
  ".tex",
  ".bib",
  ".txt",
  ".toml",
  ".cfg",
  ".ini",
  ".log",
  ".xml",
]);
const CSV_EXT = new Set([".csv", ".tsv"]);
const PDF_EXT = new Set([".pdf"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".avi", ".mov", ".mkv"]);

export function detectFileType(path: string): ViewerFileType {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (TEXT_EXT.has(ext)) return "text";
  if (CSV_EXT.has(ext)) return "csv";
  if (PDF_EXT.has(ext)) return "pdf";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  return "binary";
}

export interface ViewerProps extends BaseProps {
  /** Currently selected file path (null = empty state) */
  filePath: string | null;
  /** Build URL for raw file content */
  getFileUrl: (path: string, raw?: boolean) => string;
  /** Called when viewer is closed */
  onClose?: () => void;
}
