/**
 * ViewerManager — routes files to the correct viewer based on type.
 *
 * Manages the viewer pane (ws-viewer-content) and routes to:
 *  - ImageViewer for images
 *  - PdfViewer for PDFs
 *  - Text display for code/text files
 *  - Raw download for unknown types
 *
 * Uses ViewerAdapter for backend abstraction.
 */

import type { ViewerAdapter, ViewerConfig, OpenFile, FileType } from "./types";
import { detectFileType } from "./types";
import { renderImageViewer } from "./_ImageViewer";
import { renderPdfViewer } from "./_PdfViewer";

const DEFAULT_CONTAINER = "#ws-viewer-content";

export class ViewerManager {
  private container: HTMLElement;
  private adapter: ViewerAdapter;
  private config: ViewerConfig;
  private currentCleanup: (() => void) | null = null;
  private currentFile: string | null = null;

  constructor(config: ViewerConfig) {
    this.config = config;
    this.adapter = config.adapter;

    const el =
      typeof config.container === "string"
        ? document.querySelector<HTMLElement>(
            config.container || DEFAULT_CONTAINER,
          )
        : (config.container ??
          document.querySelector<HTMLElement>(DEFAULT_CONTAINER));

    if (!el) {
      throw new Error(
        `[ViewerManager] Container not found: ${config.container || DEFAULT_CONTAINER}`,
      );
    }
    this.container = el;
  }

  /** Open a file in the viewer pane. */
  async openFile(path: string): Promise<void> {
    // Cleanup previous viewer
    this.cleanup();
    this.currentFile = path;

    const name = path.split("/").pop() || path;
    const fileType = detectFileType(name);

    // Show the viewer pane (uncollapse if collapsed)
    this.showViewerPane();

    try {
      switch (fileType) {
        case "image":
          this.renderImage(path);
          break;
        case "pdf":
          await this.renderPdf(path);
          break;
        case "text":
          await this.renderText(path, name);
          break;
        default:
          this.renderDownload(path, name);
          break;
      }

      this.config.onFileOpen?.({
        path,
        name,
        content: "",
        fileType,
      });
    } catch (err) {
      this.container.innerHTML = `<div class="stx-shell-viewer-error"><i class="fas fa-exclamation-triangle"></i> ${err instanceof Error ? err.message : "Failed to open file"}</div>`;
    }
  }

  /** Get the currently open file path. */
  getCurrentFile(): string | null {
    return this.currentFile;
  }

  /** Clean up the current viewer. */
  cleanup(): void {
    if (this.currentCleanup) {
      this.currentCleanup();
      this.currentCleanup = null;
    }
    this.container.innerHTML = "";
  }

  /** Destroy the viewer manager. */
  destroy(): void {
    this.cleanup();
    this.currentFile = null;
  }

  /* ── Private ──────────────────────────────────── */

  private showViewerPane(): void {
    // Uncollapse the viewer pane if it's collapsed
    const pane = document.getElementById("ws-viewer-pane");
    if (pane?.classList.contains("collapsed")) {
      const toggleBtn = document.getElementById("ws-viewer-toggle");
      if (toggleBtn) toggleBtn.click();
    }

    // Hide empty state, show content
    const empty = document.getElementById("ws-viewer-empty");
    if (empty) empty.style.display = "none";
    this.container.style.display = "block";
  }

  private renderImage(path: string): void {
    const url = this.adapter.getFileUrl(path);
    const { cleanup } = renderImageViewer(this.container, url);
    this.currentCleanup = cleanup;
  }

  private async renderPdf(path: string): Promise<void> {
    const url = this.adapter.getFileUrl(path);
    const { cleanup } = await renderPdfViewer(this.container, url);
    this.currentCleanup = cleanup;
  }

  private async renderText(path: string, name: string): Promise<void> {
    const { content, language } = await this.adapter.readFile(path);

    const wrapper = document.createElement("div");
    wrapper.className = "stx-shell-viewer-text-wrapper";
    wrapper.style.cssText =
      "width:100%;height:100%;overflow:auto;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;color:var(--fg-default,#c9d1d9);background:var(--bg-primary,#0d1117);";

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (language) code.className = `language-${language}`;
    code.textContent = content;
    pre.appendChild(code);
    wrapper.appendChild(pre);
    this.container.appendChild(wrapper);

    // Highlight if hljs is available
    const hljs = (window as any).hljs;
    if (hljs) hljs.highlightElement(code);

    this.currentCleanup = () => {
      this.container.innerHTML = "";
    };
  }

  private renderDownload(path: string, name: string): void {
    const url = this.adapter.getFileUrl(path);
    const wrapper = document.createElement("div");
    wrapper.className = "stx-shell-viewer-download";
    wrapper.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--fg-muted,#8b949e);";
    wrapper.innerHTML = `
      <i class="fas fa-file-download" style="font-size:48px;opacity:0.5;"></i>
      <span>${name}</span>
      <a href="${url}" download="${name}" style="color:var(--color-accent-fg,#58a6ff);">Download file</a>
    `;
    this.container.appendChild(wrapper);

    this.currentCleanup = () => {
      this.container.innerHTML = "";
    };
  }
}
