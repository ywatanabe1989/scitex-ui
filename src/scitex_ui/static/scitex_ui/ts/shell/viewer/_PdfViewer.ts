/**
 * PdfViewer — renders PDFs using PDF.js from CDN.
 *
 * Ported from scitex-cloud's PdfViewer.ts.
 * Features: page navigation, zoom in/out, fit-width.
 */

const PDFJS_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfjsLoaded = false;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLoaded && (window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        pdfjsLoaded = true;
        resolve(lib);
      } else {
        reject(new Error("PDF.js failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

export async function renderPdfViewer(
  container: HTMLElement,
  url: string,
): Promise<{ cleanup: () => void }> {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "stx-shell-viewer-pdf-wrapper";
  wrapper.style.cssText =
    "width:100%;height:100%;display:flex;flex-direction:column;";

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "stx-shell-viewer-pdf-toolbar";
  toolbar.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:4px 8px;background:var(--bg-secondary,#161b22);border-bottom:1px solid var(--border-default,#30363d);flex-shrink:0;";
  toolbar.innerHTML = `
    <button class="stx-shell-viewer-btn" id="pdf-prev"><i class="fas fa-chevron-left"></i></button>
    <span id="pdf-page-info" style="font-size:12px;color:var(--fg-muted,#8b949e);">1 / 1</span>
    <button class="stx-shell-viewer-btn" id="pdf-next"><i class="fas fa-chevron-right"></i></button>
    <span style="flex:1;"></span>
    <button class="stx-shell-viewer-btn" id="pdf-zoom-out"><i class="fas fa-minus"></i></button>
    <span id="pdf-zoom-level" style="font-size:12px;color:var(--fg-muted,#8b949e);">100%</span>
    <button class="stx-shell-viewer-btn" id="pdf-zoom-in"><i class="fas fa-plus"></i></button>
  `;

  const canvasContainer = document.createElement("div");
  canvasContainer.style.cssText =
    "flex:1;overflow:auto;display:flex;justify-content:center;padding:8px;";

  const canvas = document.createElement("canvas");
  canvasContainer.appendChild(canvas);

  wrapper.appendChild(toolbar);
  wrapper.appendChild(canvasContainer);
  container.appendChild(wrapper);

  let pdfDoc: any = null;
  let currentPage = 1;
  let scale = 1.0;

  async function renderPage(pageNum: number): Promise<void> {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const info = wrapper.querySelector("#pdf-page-info");
    if (info) info.textContent = `${pageNum} / ${pdfDoc.numPages}`;
    const zoomEl = wrapper.querySelector("#pdf-zoom-level");
    if (zoomEl) zoomEl.textContent = `${Math.round(scale * 100)}%`;
  }

  // Wire controls
  wrapper.querySelector("#pdf-prev")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    }
  });
  wrapper.querySelector("#pdf-next")?.addEventListener("click", () => {
    if (pdfDoc && currentPage < pdfDoc.numPages) {
      currentPage++;
      renderPage(currentPage);
    }
  });
  wrapper.querySelector("#pdf-zoom-in")?.addEventListener("click", () => {
    scale = Math.min(5, scale * 1.2);
    renderPage(currentPage);
  });
  wrapper.querySelector("#pdf-zoom-out")?.addEventListener("click", () => {
    scale = Math.max(0.2, scale / 1.2);
    renderPage(currentPage);
  });

  try {
    const pdfjsLib = await loadPdfJs();
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    await renderPage(1);
  } catch (err) {
    container.innerHTML = `<div class="stx-shell-viewer-error"><i class="fas fa-exclamation-triangle"></i> Failed to load PDF: ${err instanceof Error ? err.message : "unknown error"}</div>`;
  }

  return {
    cleanup: () => {
      pdfDoc = null;
      container.innerHTML = "";
    },
  };
}
