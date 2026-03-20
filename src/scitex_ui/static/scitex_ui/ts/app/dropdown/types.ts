/**
 * Type definitions for the Dropdown component.
 */

import type { BaseComponentConfig } from "../../_base/types";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface DropdownConfig extends BaseComponentConfig {
  /** Menu items */
  items: DropdownItem[];
  /** Trigger element (button that opens the dropdown) */
  trigger: string | HTMLElement;
  /** Alignment relative to trigger: "left" or "right" (default: "left") */
  align?: "left" | "right";
  /** Called when an item is selected */
  onSelect?: (item: DropdownItem) => void;
}
