/**
 * Viewer — file preview pane. Ported from scitex-cloud workspace-viewer.
 *
 * Routes file types to dedicated sub-viewers:
 * - Image: zoom/pan (ported from ImageViewer.ts)
 * - Text: syntax-highlighted code (will integrate Monaco)
 * - CSV: table view (ported from CsvViewer.ts fallback)
 * - Audio: HTML5 audio player (ported from AudioViewer.ts)
 * - Video: HTML5 video player (ported from VideoViewer.ts)
 * - Binary: "cannot preview" message
 */

import React, { useState, useEffect, useRef } from "react";
import type { ViewerProps } from "./types";
import { detectFileType, detectLanguage } from "./types";

const CLS = "stx-shell-viewer";

/* ── Image Viewer (ported from ImageViewer.ts) ─────────────────── */
const ImageView: React.FC<{
  src: string;
  fileName: string;
}> = ({ src, fileName }) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div className={`${CLS}__error`}>
        <i className="fas fa-exclamation-triangle" /> Failed to load: {fileName}
      </div>
    );
  }

  return (
    <div
      className={`${CLS}__image-container`}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) =>
          Math.max(0.1, Math.min(10, s * (e.deltaY > 0 ? 0.9 : 1.1))),
        );
      }}
      onMouseDown={(e) => {
        dragging.current = true;
        dragStart.current = {
          x: e.clientX - translate.x,
          y: e.clientY - translate.y,
        };
      }}
      onMouseMove={(e) => {
        if (!dragging.current) return;
        setTranslate({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        });
      }}
      onMouseUp={() => {
        dragging.current = false;
      }}
      onMouseLeave={() => {
        dragging.current = false;
      }}
      onDoubleClick={() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }}
      style={{ cursor: dragging.current ? "grabbing" : "grab" }}
    >
      <img
        src={src}
        alt={fileName}
        draggable={false}
        onError={() => setError(true)}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "center center",
          maxWidth: "100%",
          maxHeight: "100%",
          userSelect: "none",
        }}
      />
    </div>
  );
};

/* ── Text Viewer — Monaco editor from CDN ──────────────────────── */
import { MonacoView } from "./MonacoView";

const TextView: React.FC<{
  content: string;
  language: string;
  filePath: string;
}> = ({ content, filePath }) => (
  <MonacoView content={content} filePath={filePath} readOnly />
);

/* ── CSV Table Viewer (ported from CsvViewer.ts fallback) ──────── */
const CsvView: React.FC<{ content: string }> = ({ content }) => {
  const rows = content.split(/\r?\n/).filter((l) => l.trim());
  if (rows.length === 0) {
    return <div className={`${CLS}__loading`}>Empty file</div>;
  }
  return (
    <div className={`${CLS}__csv-container`}>
      <table className={`${CLS}__csv-table`}>
        <thead>
          <tr>
            {rows[0].split(",").map((cell, i) => (
              <th key={i}>{cell.trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri}>
              {row.split(",").map((cell, ci) => (
                <td key={ci}>{cell.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Audio Viewer (ported from AudioViewer.ts) ─────────────────── */
const AudioView: React.FC<{ src: string; fileName: string }> = ({
  src,
  fileName,
}) => {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toUpperCase()
    : "Audio";
  return (
    <div className={`${CLS}__audio-container`}>
      <div className={`${CLS}__media-name`}>{fileName}</div>
      <div className={`${CLS}__media-format`}>{ext}</div>
      <audio controls src={src} style={{ width: "100%", maxWidth: 480 }} />
    </div>
  );
};

/* ── Video Viewer (ported from VideoViewer.ts) ─────────────────── */
const VideoView: React.FC<{ src: string; fileName: string }> = ({
  src,
  fileName,
}) => (
  <div className={`${CLS}__video-container`}>
    <div className={`${CLS}__media-toolbar`}>{fileName}</div>
    <div className={`${CLS}__video-wrapper`}>
      <video
        controls
        src={src}
        style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
      />
    </div>
  </div>
);

/* ── Main Viewer Component ─────────────────────────────────────── */
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

  const fileName = filePath?.split("/").pop() || "";
  const fileType = filePath ? detectFileType(filePath) : null;
  const language = filePath ? detectLanguage(filePath) : "plaintext";

  // Load text/csv content when file changes
  useEffect(() => {
    if (!filePath || !fileType) return;
    setTextContent(null);
    setError(null);

    if (fileType === "text" || fileType === "csv") {
      setLoading(true);
      fetch(getFileUrl(filePath))
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const ct = r.headers.get("content-type") || "";
          return ct.includes("application/json") ? r.json() : r.text();
        })
        .then((data) => {
          const text = typeof data === "string" ? data : (data.content ?? "");
          setTextContent(text);
          setLoading(false);
        })
        .catch((e) => {
          setError(e.message);
          setLoading(false);
        });
    }
  }, [filePath, fileType, getFileUrl]);

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

        {/* Route to sub-viewer by file type */}
        {fileType === "image" && (
          <ImageView src={getFileUrl(filePath, true)} fileName={fileName} />
        )}
        {fileType === "text" && textContent !== null && (
          <TextView
            content={textContent}
            language={language}
            filePath={filePath}
          />
        )}
        {fileType === "csv" && textContent !== null && (
          <CsvView content={textContent} />
        )}
        {fileType === "audio" && (
          <AudioView src={getFileUrl(filePath, true)} fileName={fileName} />
        )}
        {fileType === "video" && (
          <VideoView src={getFileUrl(filePath, true)} fileName={fileName} />
        )}
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
