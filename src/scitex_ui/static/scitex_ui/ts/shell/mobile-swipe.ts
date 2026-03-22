/**
 * Mobile Swipe Navigation for Workspace Panes.
 *
 * Detects mobile viewport via matchMedia, then enables:
 *  - Touch swipe to switch between panes
 *  - Bottom tab bar click to jump to a pane
 *  - History pushState so browser back/forward works
 *
 * Pane order: Console | Files | Viewer | Apps | Content
 * Each pane element carries a data-mobile-pane="<name>" attribute
 * set during init from its CSS class.
 */

const SWIPE_THRESHOLD = 50; // px — minimum horizontal distance to trigger switch
const MOBILE_QUERY = "(max-width: 768px)";

/** Ordered pane definitions: CSS class -> tab bar id suffix */
const PANE_ORDER = [
  { cls: "ws-ai-pane", name: "console" },
  { cls: "ws-worktree-pane", name: "files" },
  { cls: "ws-viewer-pane", name: "viewer" },
  { cls: "ws-apps-pane", name: "apps" },
  { cls: "ws-module-pane", name: "content" },
] as const;

let currentIndex = 4; // default to Content pane
let paneElements: HTMLElement[] = [];
let tabButtons: HTMLElement[] = [];
let isMobile = false;
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
let isSwiping = false;

/** Find the workspace container */
function getContainer(): HTMLElement | null {
  return document.getElementById("workspace-three-col");
}

/** Initialize pane elements from DOM */
function collectPanes(): void {
  const container = getContainer();
  if (!container) return;

  paneElements = [];
  for (const def of PANE_ORDER) {
    const el = container.querySelector<HTMLElement>(`.${def.cls}`);
    if (el) {
      el.dataset.mobilePane = def.name;
      paneElements.push(el);
    }
  }
}

/** Activate pane at given index */
function activatePane(index: number, pushState = true): void {
  if (index < 0 || index >= paneElements.length) return;
  currentIndex = index;

  // Update pane classes
  for (let i = 0; i < paneElements.length; i++) {
    const el = paneElements[i];
    el.classList.toggle("mobile-active", i === index);
    el.classList.remove("mobile-swiping");
    el.style.transform = "";
  }

  // Update tab bar active state
  const paneName = PANE_ORDER[index]?.name;
  for (const btn of tabButtons) {
    btn.classList.toggle("active", btn.dataset.mobileTab === paneName);
  }

  // Push history state
  if (pushState) {
    const url = new URL(window.location.href);
    url.searchParams.set("pane", paneName || "");
    history.replaceState({ mobilePane: index }, "", url.toString());
  }
}

/** Move to next or previous pane */
function switchPane(direction: 1 | -1): void {
  const next = currentIndex + direction;
  if (next >= 0 && next < paneElements.length) {
    activatePane(next);
  }
}

// --- Touch handlers ---

function onTouchStart(e: TouchEvent): void {
  if (!isMobile || paneElements.length === 0) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchDeltaX = 0;
  isSwiping = false;
}

function onTouchMove(e: TouchEvent): void {
  if (!isMobile || paneElements.length === 0) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  // If vertical scroll is dominant, bail out
  if (!isSwiping && Math.abs(dy) > Math.abs(dx)) return;

  // Once we determine it is a horizontal swipe, lock in
  if (!isSwiping && Math.abs(dx) > 10) {
    isSwiping = true;
  }

  if (!isSwiping) return;

  // Prevent vertical scroll while swiping horizontally
  e.preventDefault();

  touchDeltaX = dx;

  // Visual feedback: translate current pane
  const current = paneElements[currentIndex];
  if (current) {
    current.classList.add("mobile-swiping");
    current.style.transform = `translateX(${dx}px)`;
  }

  // Show adjacent pane peeking in
  const adjacentIndex = dx > 0 ? currentIndex - 1 : currentIndex + 1;
  if (adjacentIndex >= 0 && adjacentIndex < paneElements.length) {
    const adjacent = paneElements[adjacentIndex];
    adjacent.classList.add("mobile-swiping");
    const offset = dx > 0 ? dx - window.innerWidth : dx + window.innerWidth;
    adjacent.style.transform = `translateX(${offset}px)`;
  }
}

function onTouchEnd(): void {
  if (!isMobile || !isSwiping) return;
  isSwiping = false;

  // Clean up swiping state on all panes
  for (const el of paneElements) {
    el.classList.remove("mobile-swiping");
    el.style.transform = "";
  }

  if (Math.abs(touchDeltaX) > SWIPE_THRESHOLD) {
    // Swipe right (positive dx) = go to previous pane
    // Swipe left (negative dx) = go to next pane
    switchPane(touchDeltaX > 0 ? -1 : 1);
  } else {
    // Snap back — re-activate current pane to reset transforms
    activatePane(currentIndex, false);
  }

  touchDeltaX = 0;
}

// --- Tab bar click handler ---

function onTabClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-mobile-tab]",
  );
  if (!btn) return;

  const targetName = btn.dataset.mobileTab;
  const idx = PANE_ORDER.findIndex((p) => p.name === targetName);
  if (idx >= 0 && idx < paneElements.length) {
    activatePane(idx);
  }
}

// --- Media query listener ---

function onMediaChange(mql: MediaQueryList | MediaQueryListEvent): void {
  const nowMobile = mql.matches;

  if (nowMobile && !isMobile) {
    // Entering mobile mode
    isMobile = true;
    enableMobile();
  } else if (!nowMobile && isMobile) {
    // Leaving mobile mode
    isMobile = false;
    disableMobile();
  }
}

function enableMobile(): void {
  console.log("[MobileSwipe] Enabling mobile mode");
  collectPanes();
  console.log(`[MobileSwipe] Found ${paneElements.length} panes`);

  // Force-uncollapse all inner panels (desktop collapse state breaks mobile)
  const collapsedPanels = document.querySelectorAll(
    "#stx-shell-ai-panel.collapsed, #ws-worktree-sidebar.collapsed, #ws-viewer-sidebar.collapsed, #ws-apps-sidebar.collapsed",
  );
  collapsedPanels.forEach((panel) => {
    panel.classList.remove("collapsed");
    console.log(`[MobileSwipe] Uncollapsed panel: ${panel.id}`);
  });

  // Determine initial pane from URL or default to Content
  const url = new URL(window.location.href);
  const paneName = url.searchParams.get("pane");
  if (paneName) {
    const idx = PANE_ORDER.findIndex((p) => p.name === paneName);
    if (idx >= 0) currentIndex = idx;
  } else {
    currentIndex = paneElements.length - 1; // Content pane
  }

  activatePane(currentIndex, false);

  // Attach touch listeners to container
  const container = getContainer();
  if (container) {
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  // Attach tab bar listeners
  const tabBar = document.getElementById("mobile-tab-bar");
  if (tabBar) {
    tabButtons = Array.from(
      tabBar.querySelectorAll<HTMLElement>("[data-mobile-tab]"),
    );
    tabBar.addEventListener("click", onTabClick);
  }
}

function disableMobile(): void {
  // Remove mobile-active from all panes, restore desktop layout
  for (const el of paneElements) {
    el.classList.remove("mobile-active", "mobile-swiping");
    el.style.transform = "";
  }

  const container = getContainer();
  if (container) {
    container.removeEventListener("touchstart", onTouchStart);
    container.removeEventListener("touchmove", onTouchMove);
    container.removeEventListener("touchend", onTouchEnd);
  }

  const tabBar = document.getElementById("mobile-tab-bar");
  if (tabBar) {
    tabBar.removeEventListener("click", onTabClick);
  }
}

// --- Browser back/forward ---

window.addEventListener("popstate", (e) => {
  if (isMobile && e.state?.mobilePane != null) {
    activatePane(e.state.mobilePane, false);
  }
});

// --- Init ---

function init(): void {
  const container = getContainer();
  if (!container) {
    console.log("[MobileSwipe] No workspace container found, skipping");
    return;
  }

  const mql = window.matchMedia(MOBILE_QUERY);
  console.log(
    `[MobileSwipe] Init: viewport ${window.innerWidth}x${window.innerHeight}, mobile=${mql.matches}`,
  );
  onMediaChange(mql);
  mql.addEventListener("change", onMediaChange);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
