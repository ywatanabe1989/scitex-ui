/**
 * Sidebar Drawer Gesture — horizontal swipe to open/close.
 *
 * On mobile (<=768px):
 *  - Swipe right from left edge (< 30px): open sidebar drawer
 *  - Swipe left on open sidebar: close sidebar drawer
 *
 * Works on iOS Safari, Android Chrome, and all touch-capable browsers.
 * Single-finger horizontal swipe only — does not interfere with
 * vertical scroll or two-finger gestures in mobile-swipe.ts.
 */

const SWIPE_THRESHOLD = 60; // px — minimum horizontal distance to trigger
const EDGE_WIDTH = 30; // px — left edge zone for swipe-to-open
const MOBILE_QUERY = "(max-width: 768px)";

let edgeSwipeStartX = -1;
let sidebarSwipeStartX = -1;
let drawerListenersActive = false;

function getSidebar(): HTMLElement | null {
  return document.getElementById("workspace-sidebar");
}

function isDrawerOpen(): boolean {
  return getSidebar()?.classList.contains("drawer-open") ?? false;
}

function openDrawer(): void {
  const sidebar = getSidebar();
  if (!sidebar || isDrawerOpen()) return;
  sidebar.classList.add("drawer-open");
  document.body.style.overflow = "hidden";
}

function closeDrawer(): void {
  const sidebar = getSidebar();
  if (!sidebar || !isDrawerOpen()) return;
  sidebar.classList.remove("drawer-open");
  document.body.style.overflow = "";
}

// --- Swipe right from left edge → open drawer ---

function onEdgeTouchStart(e: TouchEvent): void {
  const x = e.touches[0].clientX;
  edgeSwipeStartX = x < EDGE_WIDTH ? x : -1;
}

function onEdgeTouchEnd(e: TouchEvent): void {
  if (edgeSwipeStartX < 0) return;
  const dx = e.changedTouches[0].clientX - edgeSwipeStartX;
  if (dx > SWIPE_THRESHOLD) openDrawer();
  edgeSwipeStartX = -1;
}

// --- Swipe left on open sidebar → close drawer ---

function onSidebarTouchStart(e: TouchEvent): void {
  sidebarSwipeStartX = e.touches[0].clientX;
}

function onSidebarTouchEnd(e: TouchEvent): void {
  if (sidebarSwipeStartX < 0) return;
  const dx = e.changedTouches[0].clientX - sidebarSwipeStartX;
  if (dx < -SWIPE_THRESHOLD) closeDrawer();
  sidebarSwipeStartX = -1;
}

// --- Lifecycle ---

function enableDrawerGestures(): void {
  if (drawerListenersActive) return;

  document.addEventListener("touchstart", onEdgeTouchStart, { passive: true });
  document.addEventListener("touchend", onEdgeTouchEnd, { passive: true });

  const sidebarInner = document.getElementById("sidebar-inner");
  sidebarInner?.addEventListener("touchstart", onSidebarTouchStart, {
    passive: true,
  });
  sidebarInner?.addEventListener("touchend", onSidebarTouchEnd, {
    passive: true,
  });

  drawerListenersActive = true;
}

function disableDrawerGestures(): void {
  if (!drawerListenersActive) return;

  document.removeEventListener("touchstart", onEdgeTouchStart);
  document.removeEventListener("touchend", onEdgeTouchEnd);

  const sidebarInner = document.getElementById("sidebar-inner");
  sidebarInner?.removeEventListener("touchstart", onSidebarTouchStart);
  sidebarInner?.removeEventListener("touchend", onSidebarTouchEnd);

  // Close drawer when switching to desktop
  closeDrawer();
  drawerListenersActive = false;
}

// --- Init (called from mobile-swipe.ts or standalone) ---

export function initSidebarDrawerGesture(): void {
  const mql = window.matchMedia(MOBILE_QUERY);

  function onMediaChange(e: MediaQueryList | MediaQueryListEvent): void {
    if (e.matches) {
      enableDrawerGestures();
    } else {
      disableDrawerGestures();
    }
  }

  onMediaChange(mql);
  mql.addEventListener("change", onMediaChange);
}

// Auto-init on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    initSidebarDrawerGesture(),
  );
} else {
  initSidebarDrawerGesture();
}
