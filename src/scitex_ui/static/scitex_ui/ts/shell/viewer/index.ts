/**
 * Shell viewer — barrel export.
 */

export { ViewerManager } from "./_ViewerManager";
export { renderImageViewer } from "./_ImageViewer";
export { renderPdfViewer } from "./_PdfViewer";
export { detectFileType } from "./types";
export type { ViewerAdapter, ViewerConfig, OpenFile, FileType } from "./types";
