/**
 * Shell chat — barrel export (P3a: Core + P3b: Media Extensions).
 */

export { processStream } from "./_stream-handler";
export {
  renderMarkdown,
  highlightCodeBlocks,
  fixExternalLinks,
} from "./_markdown-render";
export { saveMessage, loadMessages, clearMessages } from "./_storage";
export { loadHistory, pushHistory } from "./_history";
export { appendToolTags } from "./_tool-tags";
export { setModelBadge, MODEL_KEY } from "./_model-badge";
export type {
  ChatAdapter,
  AiContext,
  StoredMessage,
  MediaRef,
  StreamContext,
  ChatConfig,
} from "./types";

// P3b: Media Extensions
export { VoiceRecorder } from "./_recorder";
export type { SttAdapter } from "./_recorder";
export { speakText, cleanForSpeech } from "./_speech";
export type { TtsAdapter } from "./_speech";
export { ImageInputManager } from "./_image-input";
export { WebcamCapture } from "./_webcam-capture";
