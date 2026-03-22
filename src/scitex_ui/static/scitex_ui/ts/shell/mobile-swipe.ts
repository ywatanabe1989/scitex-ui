/**
 * Mobile Vertical Layout — Pane Collapse Gestures.
 *
 * On mobile (<=768px), workspace panes stack vertically.
 * This module adds:
 *  - Two-finger swipe up on any pane → collapse (shrink to header)
 *  - Two-finger swipe down on collapsed pane → expand
 *  - Double-click on pane header → toggle collapse
 *
 * Single-finger scroll is unaffected (normal content scrolling).
 */

const SWIPE_THRESHOLD = 40; // px — minimum vertical distance to trigger
const MOBILE_QUERY = "(max-width: 768px)";

let isMobile = false;

/** Sidebar ID → pane wrapper mapping */
const SIDEBAR_IDS = [
  "stx-shell-ai-panel",
  "ws-worktree-sidebar",
  "ws-viewer-sidebar",
  "ws-apps-sidebar",
];

// --- Two-finger swipe tracking ---
let touchStartY = 0;
let touchFingers = 0;
let swipeTarget: HTMLElement | null = null;

function findParentSidebar(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>(".stx-shell-sidebar");
}

function onTouchStart(e: TouchEvent): void {
  if (!isMobile) return;
  touchFingers = e.touches.length;
  if (touchFingers >= 2) {
    touchStartY = e.touches[0].clientY;
    swipeTarget = findParentSidebar(e.target as HTMLElement);
  }
}

function onTouchMove(e: TouchEvent): void {
  if (!isMobile || touchFingers < 2 || !swipeTarget) return;
  // Prevent scroll while two-finger swiping
  e.preventDefault();
}

function onTouchEnd(e: TouchEvent): void {
  if (!isMobile || touchFingers < 2 || !swipeTarget) {
    touchFingers = 0;
    swipeTarget = null;
    return;
  }

  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dy) > SWIPE_THRESHOLD) {
    if (dy < 0) {
      // Swipe up → collapse
      if (!swipeTarget.classList.contains("collapsed")) {
        const toggleBtn =
          swipeTarget.querySelector<HTMLElement>(".panel-toggle-btn");
        if (toggleBtn) toggleBtn.click();
        console.log(`[MobileGesture] Collapsed: ${swipeTarget.id}`);
      }
    } else {
      // Swipe down → expand
      if (swipeTarget.classList.contains("collapsed")) {
        const toggleBtn =
          swipeTarget.querySelector<HTMLElement>(".panel-toggle-btn");
        if (toggleBtn) toggleBtn.click();
        console.log(`[MobileGesture] Expanded: ${swipeTarget.id}`);
      }
    }
  }

  touchFingers = 0;
  swipeTarget = null;
}

// --- Double-click on pane header → toggle collapse ---

function onDblClick(e: MouseEvent): void {
  if (!isMobile) return;
  const header = (e.target as HTMLElement).closest<HTMLElement>(
    ".stx-shell-sidebar__header",
  );
  if (!header) return;

  const sidebar = header.closest<HTMLElement>(".stx-shell-sidebar");
  if (!sidebar) return;

  const toggleBtn = sidebar.querySelector<HTMLElement>(".panel-toggle-btn");
  if (toggleBtn) {
    toggleBtn.click();
    console.log(
      `[MobileGesture] Double-click toggle: ${sidebar.id} → ${sidebar.classList.contains("collapsed") ? "collapsed" : "expanded"}`,
    );
  }
}

// --- Media query listener ---

function onMediaChange(mql: MediaQueryList | MediaQueryListEvent): void {
  if (mql.matches && !isMobile) {
    isMobile = true;
    enableMobile();
  } else if (!mql.matches && isMobile) {
    isMobile = false;
    disableMobile();
  }
}

function enableMobile(): void {
  console.log("[MobileGesture] Enabling vertical layout gestures");

  const container = document.getElementById("workspace-three-col");
  if (!container) return;

  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd, { passive: true });
  container.addEventListener("dblclick", onDblClick);
}

function disableMobile(): void {
  const container = document.getElementById("workspace-three-col");
  if (!container) return;

  container.removeEventListener("touchstart", onTouchStart);
  container.removeEventListener("touchmove", onTouchMove);
  container.removeEventListener("touchend", onTouchEnd);
  container.removeEventListener("dblclick", onDblClick);
}

// --- Init ---

function init(): void {
  const container = document.getElementById("workspace-three-col");
  if (!container) return;

  const mql = window.matchMedia(MOBILE_QUERY);
  console.log(
    `[MobileGesture] Init: viewport ${window.innerWidth}x${window.innerHeight}, mobile=${mql.matches}`,
  );
  onMediaChange(mql);
  mql.addEventListener("change", onMediaChange);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
