/**
 * Media input components for the Workspace shell toolbar.
 *
 * Voice recorder (hook), webcam capture (modal), sketch canvas (modal).
 * All callback-driven — consumer decides how to use the output.
 */

export { useVoiceRecorder } from "./useVoiceRecorder";
export type {
  UseVoiceRecorderOptions,
  UseVoiceRecorderResult,
} from "./useVoiceRecorder";

export { WebcamCapture } from "./WebcamCapture";
export { SketchCanvas } from "./SketchCanvas";

export type {
  OnTranscript,
  OnImageCapture,
  SttConfig,
  MediaModalProps,
} from "./types";
