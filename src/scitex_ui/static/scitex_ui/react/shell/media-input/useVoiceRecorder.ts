/**
 * useVoiceRecorder — React hook for microphone recording + STT transcription.
 *
 * Ported from scitex-cloud's VoiceRecorder class.
 * Uses MediaRecorder API for capture, optional STT endpoint for transcription.
 *
 * Usage:
 *   const { isRecording, isTranscribing, toggle } = useVoiceRecorder({
 *     onTranscript: (text) => console.log(text),
 *     sttUrl: "/api/stt/",
 *   });
 */

import { useCallback, useRef, useState } from "react";
import type { OnTranscript, SttConfig } from "./types";

export interface UseVoiceRecorderOptions {
  /** Called with transcribed text after recording stops */
  onTranscript: OnTranscript;
  /** STT endpoint URL (omit to get raw audio blob via onRawAudio) */
  sttUrl?: string;
  /** Function to get CSRF token */
  getCsrf?: () => string;
  /** Called with raw audio blob if no sttUrl provided */
  onRawAudio?: (blob: Blob) => void;
}

export interface UseVoiceRecorderResult {
  isRecording: boolean;
  isTranscribing: boolean;
  toggle: () => void;
  error: string | null;
}

export function useVoiceRecorder(
  opts: UseVoiceRecorderOptions,
): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setIsRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    audioChunks.current = [];

    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;

      const recorder = new MediaRecorder(s, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        audioChunks.current = [];

        if (opts.onRawAudio && !opts.sttUrl) {
          opts.onRawAudio(blob);
          return;
        }

        if (!opts.sttUrl) {
          setError("No STT endpoint configured");
          return;
        }

        // Transcribe via STT endpoint
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "recording.webm");

          const headers: Record<string, string> = {};
          if (opts.getCsrf) {
            headers["X-CSRFToken"] = opts.getCsrf();
          }

          const res = await fetch(opts.sttUrl, {
            method: "POST",
            headers,
            body: fd,
          });

          if (!res.ok) {
            throw new Error(`STT failed: ${res.status}`);
          }

          const data = await res.json();
          if (data.error) {
            setError(data.error);
          } else if (data.text) {
            opts.onTranscript(data.text);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access denied"
          : e instanceof Error
            ? e.message
            : String(e);
      setError(msg);
    }
  }, [opts]);

  const toggle = useCallback(() => {
    if (isRecording) {
      stop();
    } else if (!isTranscribing) {
      start();
    }
  }, [isRecording, isTranscribing, start, stop]);

  return { isRecording, isTranscribing, toggle, error };
}
