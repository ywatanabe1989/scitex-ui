/**
 * Type definitions for the Chat component.
 */

import type { BaseProps } from "../../_base/types";
import type { ChatBackend, ChatMessage } from "../workspace/types";

export interface ChatProps extends BaseProps {
  /** Chat backend (handles message sending/streaming) */
  backend: ChatBackend;
  /** Placeholder text for input */
  placeholder?: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** localStorage key for message persistence */
  storageKey?: string;
}
