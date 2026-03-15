/**
 * Viewer — file preview pane for the workspace shell.
 * Ported from scitex-cloud's workspace-viewer.
 *
 * Displays file content based on type:
 * - Images: zoom/pan viewer
 * - Text: syntax-highlighted code view
 * - CSV: table view
 * - Empty state when no file selected
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { ViewerProps } from "./types";
import { detectFileType } from "./types";

const CLS = "stx-shell-viewer";

export const Viewer: React.FC<ViewerProps> = ({
  filePath,
  getFileUrl,
  onClose,
  className,
  style,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image zoom/pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const fileName = filePath?.split("/").pop() || "";
  const fileType = filePath ? detectFileType(filePath) : null;

  // Load text content when file changes
  useEffect(() => {
    if (!filePath || !fileType) return;
    setTextContent(null);
    setError(null);
    setScale(1);
    setTranslate({ x: 0, y: 0 });

    if (fileType === "text" || fileType === "csv") {
      setLoading(true);
      fetch(getFileUrl(filePath))
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          setTextContent(data.content ?? JSON.stringify(data, null, 2));
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    }
  }, [filePath, fileType, getFileUrl]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) =>
      Math.max(0.1, Math.min(10, s * (e.deltaY > 0 ? 0.9 : 1.1))),
    );
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      dragStart.current = {
        x: e.clientX - translate.x,
        y: e.clientY - translate.y,
      };
    },
    [translate],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    setTranslate({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Empty state
  if (!filePath) {
    return (
      <div className={`${CLS} ${CLS}--empty ${className ?? ""}`} style={style}>
        <i className="fas fa-eye" />
        <p>Click a file to preview</p>
      </div>
    );
  }

  return (
    <div className={`${CLS} ${className ?? ""}`} style={style}>
      {/* Header with filename */}
      <div className={`${CLS}__header`}>
        <span className={`${CLS}__filename`} title={filePath}>
          {fileName}
        </span>
        {onClose && (
          <button className={`${CLS}__close`} onClick={onClose} title="Close">
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`${CLS}__content`}>
        {loading && (
          <div className={`${CLS}__loading`}>
            <i className="fas fa-spinner fa-spin" /> Loading...
          </div>
        )}

        {error && (
          <div className={`${CLS}__error`}>
            <i className="fas fa-exclamation-triangle" /> {error}
          </div>
        )}

        {/* Image viewer with zoom/pan */}
        {fileType === "image" && (
          <div
            className={`${CLS}__image-container`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: dragging.current ? "grabbing" : "grab" }}
          >
            <img
              src={getFileUrl(filePath, true)}
              alt={fileName}
              draggable={false}
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transformOrigin: "center center",
                maxWidth: "100%",
                maxHeight: "100%",
                userSelect: "none",
              }}
            />
          </div>
        )}

        {/* Text viewer */}
        {(fileType === "text" || fileType === "csv") &&
          textContent !== null && (
            <pre className={`${CLS}__text`}>
              <code>{textContent}</code>
            </pre>
          )}

        {/* Binary / unsupported */}
        {fileType === "binary" && (
          <div className={`${CLS}__binary`}>
            <i className="fas fa-file" />
            <p>Binary file — cannot preview</p>
          </div>
        )}
      </div>
    </div>
  );
};
