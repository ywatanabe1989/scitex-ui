/**
 * Shell viewer types — adapter interface for file viewing.
 */

/** File types for viewer routing. */
export type FileType =
  | "text"
  | "image"
  | "pdf"
  | "csv"
  | "video"
  | "audio"
  | "unknown";

/** Backend adapter for file content. */
export interface ViewerAdapter {
  /** Read file content (text files). */
  readFile(path: string): Promise<{ content: string; language?: string }>;

  /** Save file content (text files). */
  saveFile?(path: string, content: string): Promise<void>;

  /** Get a URL to serve the raw file (images, PDFs, etc.). */
  getFileUrl(path: string): string;
}

/** An open file in the viewer. */
export interface OpenFile {
  path: string;
  name: string;
  content: string;
  fileType: FileType;
  language?: string;
  dirty?: boolean;
}

export interface ViewerConfig {
  /** Container for the viewer content (default: "#ws-viewer-content") */
  container?: string | HTMLElement;

  /** Container for file tabs (default: "#ws-viewer-tabs") */
  tabsContainer?: string | HTMLElement;

  /** Backend adapter. */
  adapter: ViewerAdapter;

  /** Called when a file is opened/switched. */
  onFileOpen?: (file: OpenFile) => void;

  /** Called when a file is saved. */
  onFileSave?: (path: string) => void;
}

/** Detect file type from extension. */
export function detectFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const IMAGE_EXTS = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
    "bmp",
    "ico",
  ]);
  const PDF_EXTS = new Set(["pdf"]);
  const CSV_EXTS = new Set(["csv", "tsv"]);
  const VIDEO_EXTS = new Set(["mp4", "webm", "ogg", "mov"]);
  const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "flac", "m4a"]);

  if (IMAGE_EXTS.has(ext)) return "image";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (CSV_EXTS.has(ext)) return "csv";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return "text";
}
