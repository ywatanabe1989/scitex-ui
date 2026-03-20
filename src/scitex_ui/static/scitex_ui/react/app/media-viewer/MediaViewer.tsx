/**
 * MediaViewer — React component for displaying non-text files.
 * Mirrors: ts/app/media-viewer/_MediaViewer.ts
 */

import React, { useState, useCallback, useRef } from "react";
import type { BaseProps } from "../../_base/types";

const CLS = "stx-app-media-viewer";

export type MediaFileType =
  | "image"
  | "pdf"
  | "mermaid"
  | "graphviz"
  | "binary"
  | "text";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
]);
const PDF_EXT = new Set([".pdf"]);
const BINARY_EXT = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".mp3",
  ".mp4",
  ".wav",
  ".doc",
  ".docx",
]);

function detectType(path: string): MediaFileType {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (PDF_EXT.has(ext)) return "pdf";
  if (ext === ".mmd" || ext === ".mermaid") return "mermaid";
  if (ext === ".dot" || ext === ".gv") return "graphviz";
  if (BINARY_EXT.has(ext)) return "binary";
  return "text";
}

export interface MediaViewerProps extends BaseProps {
  /** File path to display */
  filePath: string;
  /** Override detected file type */
  fileType?: MediaFileType;
  /** Build URL for file content */
  getFileUrl: (path: string, raw?: boolean, download?: boolean) => string;
  /** Called on download */
  onDownload?: (path: string) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  filePath,
  fileType,
  getFileUrl,
  onDownload,
  className,
  style,
}) => {
  const type = fileType || detectType(filePath);
  const fileName = filePath.split("/").pop() || filePath;
  const [imgError, setImgError] = useState(false);

  // Zoom state for images
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const download = useCallback(() => {
    const a = document.createElement("a");
    a.href = getFileUrl(filePath, true, true);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    onDownload?.(filePath);
  }, [filePath, fileName, getFileUrl, onDownload]);

  if (type === "text") return null;

  const toolbar = (icon: string) => (
    <div className={`${CLS}__toolbar`}>
      <div className={`${CLS}__toolbar-left`}>
        <i className={icon} />
        <span title={filePath}>{fileName}</span>
      </div>
      <div className={`${CLS}__toolbar-right`}>
        <button className={`${CLS}__btn`} title="Download" onClick={download}>
          <i className="fas fa-download" />
        </button>
        <button
          className={`${CLS}__btn`}
          title="Open in new tab"
          onClick={() =>
            window.open(getFileUrl(filePath, true, false), "_blank")
          }
        >
          <i className="fas fa-external-link-alt" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`${CLS} ${className ?? ""}`}
      style={{ display: "flex", ...style }}
    >
      {type === "image" && (
        <div className={`${CLS}__image-wrapper`}>
          {toolbar("fas fa-image")}
          <div
            className={`${CLS}__image-container`}
            onWheel={(e) => {
              e.preventDefault();
              setScale((s) =>
                Math.max(0.1, Math.min(10, s * (e.deltaY > 0 ? 0.9 : 1.1))),
              );
            }}
          >
            {imgError ? (
              <div className={`${CLS}__error`}>
                <i className="fas fa-exclamation-triangle" /> Failed to load
                image
              </div>
            ) : (
              <img
                className={`${CLS}__image`}
                src={getFileUrl(filePath, true, false)}
                alt={fileName}
                style={{
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  cursor: dragging.current ? "grabbing" : "grab",
                }}
                onError={() => setImgError(true)}
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
                onDoubleClick={() => {
                  setScale(1);
                  setTranslate({ x: 0, y: 0 });
                }}
                draggable={false}
              />
            )}
          </div>
        </div>
      )}

      {type === "pdf" && (
        <div className={`${CLS}__pdf-wrapper`}>
          {toolbar("fas fa-file-pdf")}
          <iframe
            className={`${CLS}__pdf-frame`}
            src={getFileUrl(filePath, true, false)}
          />
        </div>
      )}

      {type === "binary" && (
        <div className={`${CLS}__binary-wrapper`}>
          <i className={`fas fa-file-archive ${CLS}__binary-icon`} />
          <h3>Binary File</h3>
          <p>{fileName}</p>
          <button className={`${CLS}__download-btn`} onClick={download}>
            <i className="fas fa-download" /> Download
          </button>
        </div>
      )}

      {(type === "mermaid" || type === "graphviz") && (
        <div className={`${CLS}__diagram-wrapper`}>
          {toolbar(
            type === "mermaid" ? "fas fa-project-diagram" : "fas fa-sitemap",
          )}
          <div className={`${CLS}__diagram-content`}>
            <div className={`${CLS}__loading`}>
              <i className="fas fa-spinner fa-spin" /> Loading {type} diagram...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
