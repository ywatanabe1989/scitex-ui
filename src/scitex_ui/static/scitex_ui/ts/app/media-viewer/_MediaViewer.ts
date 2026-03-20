/**
 * MediaViewer — displays non-text files (images, PDFs, diagrams).
 *
 * Usage:
 *   import { MediaViewer } from 'scitex_ui/ts/app/media-viewer';
 *   const viewer = new MediaViewer({
 *     container: '#media-panel',
 *     getFileUrl: (path, raw) => `/api/file/${path}?raw=${raw}`,
 *   });
 *   viewer.displayFile('plot.png');
 */

import { BaseComponent } from "../../_base/BaseComponent";
import type { MediaViewerConfig, MediaFileType } from "./types";
import { detectFileType } from "./types";

const CLS = "stx-app-media-viewer";

export class MediaViewer extends BaseComponent<MediaViewerConfig> {
  private currentFile: string | null = null;

  constructor(config: MediaViewerConfig) {
    super(config);
    this.container.classList.add(CLS);
  }

  /** Display a file. Auto-detects type from extension. */
  async displayFile(filePath: string, fileType?: MediaFileType): Promise<void> {
    const type = fileType || detectFileType(filePath);

    if (type === "text") {
      this.container.innerHTML = "";
      this.container.style.display = "none";
      return;
    }

    this.currentFile = filePath;
    this.container.innerHTML = "";
    this.container.style.display = "flex";

    switch (type) {
      case "image":
        this.renderImage(filePath);
        break;
      case "pdf":
        this.renderPdf(filePath);
        break;
      case "binary":
        this.renderBinary(filePath);
        break;
      case "mermaid":
      case "graphviz":
        this.renderDiagram(filePath, type);
        break;
    }
  }

  /** Check if a file can be displayed. */
  canDisplay(filePath: string): boolean {
    return detectFileType(filePath) !== "text";
  }

  /** Get current file path. */
  getCurrentFile(): string | null {
    return this.currentFile;
  }

  /** Hide the viewer. */
  hide(): void {
    this.container.style.display = "none";
  }

  override destroy(): void {
    this.container.classList.remove(CLS);
    super.destroy();
  }

  // ── Renderers ──────────────────────────────────────────────────────

  private renderImage(filePath: string): void {
    const wrapper = document.createElement("div");
    wrapper.className = `${CLS}__image-wrapper`;

    wrapper.appendChild(this.createToolbar(filePath, "fas fa-image"));

    const imgContainer = document.createElement("div");
    imgContainer.className = `${CLS}__image-container`;

    const img = document.createElement("img");
    img.className = `${CLS}__image`;
    img.alt = filePath.split("/").pop() || "Image";
    img.src = this.config.getFileUrl(filePath, true, false);
    img.onerror = () => {
      img.style.display = "none";
      imgContainer.innerHTML += `<div class="${CLS}__error">
        <i class="fas fa-exclamation-triangle"></i> Failed to load image
      </div>`;
    };

    imgContainer.appendChild(img);
    wrapper.appendChild(imgContainer);
    this.container.appendChild(wrapper);

    this.setupZoomPan(img, imgContainer);
  }

  private renderPdf(filePath: string): void {
    const wrapper = document.createElement("div");
    wrapper.className = `${CLS}__pdf-wrapper`;

    wrapper.appendChild(this.createToolbar(filePath, "fas fa-file-pdf"));

    const iframe = document.createElement("iframe");
    iframe.className = `${CLS}__pdf-frame`;
    iframe.src = this.config.getFileUrl(filePath, true, false);
    wrapper.appendChild(iframe);

    this.container.appendChild(wrapper);
  }

  private renderBinary(filePath: string): void {
    const fileName = filePath.split("/").pop() || filePath;
    const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();

    const wrapper = document.createElement("div");
    wrapper.className = `${CLS}__binary-wrapper`;
    wrapper.innerHTML = `
      <i class="fas fa-file-archive ${CLS}__binary-icon"></i>
      <h3>Binary File</h3>
      <p>${fileName}</p>
      <p class="${CLS}__binary-info">Cannot preview ${ext} files</p>
    `;

    const btn = document.createElement("button");
    btn.className = `${CLS}__download-btn`;
    btn.innerHTML = '<i class="fas fa-download"></i> Download';
    btn.addEventListener("click", () => this.download(filePath));
    wrapper.appendChild(btn);

    this.container.appendChild(wrapper);
  }

  private renderDiagram(filePath: string, type: "mermaid" | "graphviz"): void {
    const wrapper = document.createElement("div");
    wrapper.className = `${CLS}__diagram-wrapper`;

    const icon =
      type === "mermaid" ? "fas fa-project-diagram" : "fas fa-sitemap";
    wrapper.appendChild(this.createToolbar(filePath, icon));

    const content = document.createElement("div");
    content.className = `${CLS}__diagram-content`;
    content.innerHTML = `<div class="${CLS}__loading">
      <i class="fas fa-spinner fa-spin"></i> Loading ${type} diagram...
    </div>`;
    wrapper.appendChild(content);
    this.container.appendChild(wrapper);

    // Fetch and render
    fetch(this.config.getFileUrl(filePath, true, false))
      .then((r) => r.text())
      .then((source) => {
        content.innerHTML = `<pre class="${CLS}__diagram-source">${source}</pre>`;
      })
      .catch(() => {
        content.innerHTML = `<div class="${CLS}__error">
          <i class="fas fa-exclamation-triangle"></i> Failed to load diagram
        </div>`;
      });
  }

  // ── Shared helpers ─────────────────────────────────────────────────

  private createToolbar(filePath: string, iconClass: string): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = `${CLS}__toolbar`;

    const fileName = filePath.split("/").pop() || filePath;
    toolbar.innerHTML = `
      <div class="${CLS}__toolbar-left">
        <i class="${iconClass}"></i>
        <span title="${filePath}">${fileName}</span>
      </div>
    `;

    const right = document.createElement("div");
    right.className = `${CLS}__toolbar-right`;

    const dlBtn = document.createElement("button");
    dlBtn.className = `${CLS}__btn`;
    dlBtn.title = "Download";
    dlBtn.innerHTML = '<i class="fas fa-download"></i>';
    dlBtn.addEventListener("click", () => this.download(filePath));
    right.appendChild(dlBtn);

    const openBtn = document.createElement("button");
    openBtn.className = `${CLS}__btn`;
    openBtn.title = "Open in new tab";
    openBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
    openBtn.addEventListener("click", () => {
      window.open(this.config.getFileUrl(filePath, true, false), "_blank");
    });
    right.appendChild(openBtn);

    toolbar.appendChild(right);
    return toolbar;
  }

  private download(filePath: string): void {
    const a = document.createElement("a");
    a.href = this.config.getFileUrl(filePath, true, true);
    a.download = filePath.split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    this.config.onDownload?.(filePath);
  }

  private setupZoomPan(img: HTMLImageElement, container: HTMLElement): void {
    let scale = 1;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let tx = 0;
    let ty = 0;

    const update = () => {
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };

    container.addEventListener("wheel", (e) => {
      e.preventDefault();
      scale = Math.max(0.1, Math.min(10, scale * (e.deltaY > 0 ? 0.9 : 1.1)));
      update();
    });

    img.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      img.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      update();
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
      img.style.cursor = "grab";
    });

    img.addEventListener("dblclick", () => {
      scale = 1;
      tx = 0;
      ty = 0;
      update();
    });

    img.style.cursor = "grab";
  }
}
