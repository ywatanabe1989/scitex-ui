/**
 * ImageViewer — displays images with zoom and pan.
 *
 * Ported from scitex-cloud's ImageViewer.ts.
 * Features: mouse wheel zoom (0.1x–10x), drag pan, double-click reset.
 */

export function renderImageViewer(
  container: HTMLElement,
  url: string,
): { cleanup: () => void } {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "stx-shell-viewer-image-wrapper";
  wrapper.style.cssText =
    "width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;cursor:grab;";

  const img = document.createElement("img");
  img.src = url;
  img.style.cssText =
    "max-width:100%;max-height:100%;transition:transform 0.1s ease;";
  img.draggable = false;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  function updateTransform(): void {
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  // Zoom with mouse wheel
  wrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.min(10, Math.max(0.1, scale * factor));
    updateTransform();
  });

  // Pan with mouse drag
  let dragging = false;
  let startX = 0;
  let startY = 0;

  wrapper.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    wrapper.style.cursor = "grabbing";
  });

  wrapper.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  wrapper.addEventListener("mouseup", () => {
    dragging = false;
    wrapper.style.cursor = "grab";
  });

  wrapper.addEventListener("mouseleave", () => {
    dragging = false;
    wrapper.style.cursor = "grab";
  });

  // Double-click reset
  wrapper.addEventListener("dblclick", () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  });

  // Error handling
  img.onerror = () => {
    wrapper.innerHTML =
      '<div class="stx-shell-viewer-error"><i class="fas fa-exclamation-triangle"></i> Failed to load image</div>';
  };

  wrapper.appendChild(img);
  container.appendChild(wrapper);

  return {
    cleanup: () => {
      container.innerHTML = "";
    },
  };
}
