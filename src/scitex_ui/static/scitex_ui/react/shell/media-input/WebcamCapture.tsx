/**
 * WebcamCapture — Modal for capturing photos from the camera.
 *
 * Ported from scitex-cloud's WebcamCapture class.
 * Uses getUserMedia for live video, canvas for frame capture.
 *
 * Usage:
 *   <WebcamCapture
 *     open={showCamera}
 *     onClose={() => setShowCamera(false)}
 *     onCapture={(dataUrl, mime) => handleImage(dataUrl, mime)}
 *   />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MediaModalProps, OnImageCapture } from "./types";

interface WebcamCaptureProps extends MediaModalProps {
  onCapture: OnImageCapture;
  /** JPEG quality 0–1 (default 0.9) */
  quality?: number;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  open,
  onClose,
  onCapture,
  quality = 0.9,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (!open) return;
    setError(null);

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 1280 } } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof DOMException && e.name === "NotAllowedError"
              ? "Camera access denied"
              : e.message || String(e),
          );
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    onCapture(dataUrl, "image/jpeg");
    onClose();
  }, [onCapture, onClose, quality]);

  const handleFlip = useCallback(() => {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  }, []);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="stx-shell-media-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="stx-shell-media-modal">
        <div className="stx-shell-media-modal__header">
          <span>Camera</span>
          <button onClick={onClose} title="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="stx-shell-media-modal__body">
          {error ? (
            <div className="stx-shell-media-modal__error">
              <i className="fas fa-exclamation-triangle" />
              <span>{error}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", borderRadius: 6, background: "#000" }}
            />
          )}
        </div>

        <div className="stx-shell-media-modal__actions">
          <button
            className="stx-shell-media-btn stx-shell-media-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="stx-shell-media-btn stx-shell-media-btn--secondary"
            onClick={handleFlip}
            title="Flip camera"
          >
            <i className="fas fa-sync-alt" />
          </button>
          <button
            className="stx-shell-media-btn stx-shell-media-btn--primary"
            onClick={handleCapture}
            disabled={!!error}
          >
            <i className="fas fa-camera" /> Capture
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
};
