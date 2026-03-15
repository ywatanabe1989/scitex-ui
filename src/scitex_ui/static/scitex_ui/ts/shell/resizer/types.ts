/**
 * Type definitions for the Resizer component.
 */

import type { BaseComponentConfig } from "../../_base/types";

export type ResizerDirection = "horizontal" | "vertical";

export interface ResizerConfig extends BaseComponentConfig {
  /** Resize direction: horizontal (left/right) or vertical (top/bottom) */
  direction: ResizerDirection;
  /** CSS selector or element for the first (left/top) panel */
  firstPanel: string | HTMLElement;
  /** CSS selector or element for the second (right/bottom) panel */
  secondPanel: string | HTMLElement;
  /** Minimum size in pixels for first panel (default: 48) */
  minFirst?: number;
  /** Minimum size in pixels for second panel (default: 48) */
  minSecond?: number;
  /** localStorage key for persisting size (default: none) */
  storageKey?: string;
  /** Show collapse toggle button (default: true) */
  showToggle?: boolean;
  /** Which panel collapses on toggle: "first" or "second" (default: "first") */
  collapseTarget?: "first" | "second";
  /** Callback when panel is resized */
  onResize?: (firstSize: number, secondSize: number) => void;
  /** Callback when panel is collapsed/expanded */
  onToggle?: (collapsed: boolean) => void;
}
