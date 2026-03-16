/**
 * Shared types for media input components (voice, camera, sketch).
 *
 * These are callback-driven: each component produces output (text, image)
 * and the consumer decides what to do with it.
 */

/** Callback when voice input produces transcribed text */
export type OnTranscript = (text: string) => void;

/** Callback when an image is captured (camera or sketch) */
export type OnImageCapture = (dataUrl: string, mimeType: string) => void;

/** Optional STT (speech-to-text) backend configuration */
export interface SttConfig {
  /** URL for the STT API endpoint */
  url: string;
  /** Function to get CSRF token (Django apps) */
  getCsrf?: () => string;
  /** Model name for STT */
  model?: string;
}

/** Props shared by all media input modal components */
export interface MediaModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close callback */
  onClose: () => void;
}
