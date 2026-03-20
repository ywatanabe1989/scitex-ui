/**
 * Resizer components — draggable panel resizers with state persistence.
 *
 * Features: horizontal/vertical resizing, snap points, cascade propagation,
 * toggle collapse, localStorage state persistence.
 */

export type {
  HorizontalConfig,
  VerticalConfig,
  BaseOpts,
  PropagationTarget,
} from "./types";
export { HorizontalResizer } from "./_horizontal";
export { VerticalResizer } from "./_vertical";
export { BaseResizer } from "./_base";
