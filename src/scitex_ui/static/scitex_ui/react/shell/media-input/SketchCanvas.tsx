/**
 * SketchCanvas — Modal with freehand drawing canvas.
 *
 * Ported from scitex-cloud's SketchCanvas class.
 * Uses Canvas 2D + Pointer Events for drawing.
 *
 * Usage:
 *   <SketchCanvas
 *     open={showSketch}
 *     onClose={() => setShowSketch(false)}
 *     onDone={(dataUrl, mime) => handleImage(dataUrl, mime)}
 *   />
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MediaModalProps, OnImageCapture } from "./types";

interface SketchCanvasProps extends MediaModalProps {
  onDone: OnImageCapture;
}

type Tool = "pen" | "eraser";

const CANVAS_W = 1200;
const CANVAS_H = 800;
const WIDTHS = [2, 5, 10];

function getColors(): string[] {
  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";
  return isDark
    ? [
        "#ffffff",
        "#ff6b6b",
        "#ffd93d",
        "#6bcb77",
        "#4d96ff",
        "#9b59b6",
        "#ff9f43",
        "#54a0ff",
      ]
    : [
        "#000000",
        "#e74c3c",
        "#f39c12",
        "#27ae60",
        "#2980b9",
        "#8e44ad",
        "#e67e22",
        "#3498db",
      ];
}

function getBgColor(): string {
  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";
  return isDark ? "#1a1a2e" : "#ffffff";
}

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
  open,
  onClose,
  onDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(() => getColors()[0]);
  const [lineWidth, setLineWidth] = useState(5);
  const drawing = useRef(false);

  // Initialize canvas with background color
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, [open]);

  // Drawing helpers
  const coords = useCallback((e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    ];
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      drawing.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      const [x, y] = coords(e);
      ctx.moveTo(x, y);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
      }

      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [tool, color, lineWidth, coords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing.current) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const [x, y] = coords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [coords],
  );

  const handlePointerUp = useCallback(() => {
    drawing.current = false;
  }, []);

  const handleClear = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const handleDone = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onDone(dataUrl, "image/png");
    onClose();
  }, [onDone, onClose]);

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

  const colors = getColors();

  return (
    <div
      className="stx-shell-media-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="stx-shell-media-modal"
        style={{ maxWidth: 960, width: "90vw" }}
      >
        <div className="stx-shell-media-modal__header">
          <span>Sketch</span>
          <button onClick={onClose} title="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="stx-shell-sketch-toolbar">
          {/* Tool buttons */}
          <button
            className={`stx-shell-sketch-tool${tool === "pen" ? " active" : ""}`}
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <i className="fas fa-pen" />
          </button>
          <button
            className={`stx-shell-sketch-tool${tool === "eraser" ? " active" : ""}`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <i className="fas fa-eraser" />
          </button>

          <span className="stx-shell-sketch-separator" />

          {/* Color swatches */}
          {colors.map((c) => (
            <button
              key={c}
              className={`stx-shell-sketch-swatch${c === color ? " active" : ""}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setTool("pen");
              }}
              title={c}
            />
          ))}

          <span className="stx-shell-sketch-separator" />

          {/* Width buttons */}
          {WIDTHS.map((w) => (
            <button
              key={w}
              className={`stx-shell-sketch-width${w === lineWidth ? " active" : ""}`}
              onClick={() => setLineWidth(w)}
              title={`${w}px`}
            >
              <span
                style={{
                  width: Math.min(w * 2, 16),
                  height: Math.min(w * 2, 16),
                  borderRadius: "50%",
                  background: "currentColor",
                  display: "inline-block",
                }}
              />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="stx-shell-media-modal__body">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              width: "100%",
              cursor: "crosshair",
              borderRadius: 4,
              touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
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
            onClick={handleClear}
          >
            <i className="fas fa-trash" /> Clear
          </button>
          <button
            className="stx-shell-media-btn stx-shell-media-btn--primary"
            onClick={handleDone}
          >
            <i className="fas fa-check" /> Done
          </button>
        </div>
      </div>
    </div>
  );
};
