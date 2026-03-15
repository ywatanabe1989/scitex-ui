/**
 * Type definitions for the Terminal component.
 */

import type { BaseProps } from "../../_base/types";
import type { TerminalBackend } from "../workspace/types";

export interface TerminalProps extends BaseProps {
  /** Terminal backend (handles connection, I/O) */
  backend: TerminalBackend;
  /** Font size (default: 13) */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Scrollback lines (default: 10000) */
  scrollback?: number;
}
