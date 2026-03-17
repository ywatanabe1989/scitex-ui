/** Shared types for the PaneLayout system. */

export interface PaneInfo {
  el: HTMLElement;
  id: string;
  index: number;
  fixed: boolean;
  fixedSize: number;
  minSize: number;
  defaultSize: number;
  canCollapse: boolean;
  size: number;
  collapsed: boolean;
  collapseMode: "manual" | "auto" | null;
}

export interface ResizerInfo {
  el: HTMLElement;
  leftPartner: PaneInfo;
  rightPartner: PaneInfo;
}

export const COLLAPSE_WIDTH = 40;
export const RESIZER_WIDTH = 1;
