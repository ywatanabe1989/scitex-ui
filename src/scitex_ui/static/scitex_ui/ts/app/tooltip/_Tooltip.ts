/**
 * Tooltip — auto-positioned tooltip system using data-tooltip attributes.
 *
 * Usage:
 *   import { Tooltip } from 'scitex_ui/ts/app/tooltip';
 *   Tooltip.init();  // scans for [data-tooltip] elements
 *
 * HTML:
 *   <button data-tooltip="Save file">Save</button>
 *   <button data-tooltip="Delete" data-tooltip-position="top">Del</button>
 */

import type { TooltipConfig, TooltipPosition } from "./types";

const CLS = "stx-app-tooltip";
const MARGIN = 8;

let tooltipEl: HTMLDivElement | null = null;
let showTimeout: ReturnType<typeof setTimeout> | null = null;
let currentTarget: HTMLElement | null = null;

function getOrCreateTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = CLS;
    tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function bestPosition(
  target: DOMRect,
  preferred: TooltipPosition,
): TooltipPosition {
  if (preferred !== "auto") return preferred;

  const spaceAbove = target.top;
  const spaceBelow = window.innerHeight - target.bottom;
  const spaceLeft = target.left;
  const spaceRight = window.innerWidth - target.right;

  // Prefer bottom, then top, then right, then left
  if (spaceBelow >= 40) return "bottom";
  if (spaceAbove >= 40) return "top";
  if (spaceRight >= 100) return "right";
  if (spaceLeft >= 100) return "left";
  return "bottom";
}

function positionTooltip(
  tip: HTMLDivElement,
  target: DOMRect,
  pos: TooltipPosition,
): void {
  const tipRect = tip.getBoundingClientRect();

  let top = 0;
  let left = 0;

  switch (pos) {
    case "bottom":
      top = target.bottom + MARGIN;
      left = target.left + target.width / 2 - tipRect.width / 2;
      break;
    case "top":
      top = target.top - tipRect.height - MARGIN;
      left = target.left + target.width / 2 - tipRect.width / 2;
      break;
    case "right":
      top = target.top + target.height / 2 - tipRect.height / 2;
      left = target.right + MARGIN;
      break;
    case "left":
      top = target.top + target.height / 2 - tipRect.height / 2;
      left = target.left - tipRect.width - MARGIN;
      break;
  }

  // Clamp to viewport
  left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));
  top = Math.max(4, Math.min(top, window.innerHeight - tipRect.height - 4));

  tip.style.top = `${top + window.scrollY}px`;
  tip.style.left = `${left + window.scrollX}px`;
}

function showTooltip(target: HTMLElement, config: TooltipConfig): void {
  const text = target.getAttribute("data-tooltip");
  if (!text) return;

  const tip = getOrCreateTooltip();
  tip.textContent = text;
  tip.style.display = "block";
  tip.style.opacity = "0";

  currentTarget = target;

  // Position after content renders
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const preferred =
      (target.getAttribute("data-tooltip-position") as TooltipPosition) ||
      config.position ||
      "auto";
    const pos = bestPosition(rect, preferred);
    positionTooltip(tip, rect, pos);
    tip.dataset.position = pos;
    tip.style.opacity = "1";
  });
}

function hideTooltip(): void {
  if (showTimeout) {
    clearTimeout(showTimeout);
    showTimeout = null;
  }
  if (tooltipEl) {
    tooltipEl.style.display = "none";
    tooltipEl.style.opacity = "0";
  }
  currentTarget = null;
}

export const Tooltip = {
  /** Initialize tooltip system. Call once. */
  init(config: TooltipConfig = {}): void {
    const delay = config.delay ?? 300;
    const root = config.root || document.body;

    root.addEventListener(
      "mouseenter",
      (e: Event) => {
        const target = (e.target as HTMLElement)?.closest?.(
          config.selector || "[data-tooltip]",
        ) as HTMLElement | null;
        if (!target) return;

        showTimeout = setTimeout(() => showTooltip(target, config), delay);
      },
      true,
    );

    root.addEventListener(
      "mouseleave",
      (e: Event) => {
        const target = (e.target as HTMLElement)?.closest?.(
          config.selector || "[data-tooltip]",
        );
        if (target) hideTooltip();
      },
      true,
    );

    // Hide on scroll or resize
    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", hideTooltip);
  },

  /** Programmatically hide tooltip. */
  hide: hideTooltip,
};
