/**
 * Terminal — React wrapper for xterm.js with pluggable backend.
 *
 * Usage:
 *   import { Terminal } from '@scitex/ui/react/shell/terminal';
 *   <Terminal backend={localTerminalBackend} />
 *
 * xterm.js is loaded from CDN to avoid bundling issues.
 */

import React, { useRef, useEffect, useState } from "react";
import type { TerminalProps } from "./types";

const CLS = "stx-shell-terminal";

const XTERM_JS = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js";
const XTERM_CSS = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css";
const FIT_ADDON =
  "https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js";

let xtermLoaded = false;

async function loadXterm(): Promise<void> {
  if (xtermLoaded) return;

  // Load CSS
  if (!document.querySelector(`link[href="${XTERM_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = XTERM_CSS;
    document.head.appendChild(link);
  }

  // Load JS (disable AMD to avoid conflicts)
  const win = window as any;
  const savedDefine = win.define;
  const savedRequire = win.require;
  win.define = undefined;
  win.require = undefined;

  try {
    const [xtermCode, fitCode] = await Promise.all([
      fetch(XTERM_JS).then((r) => r.text()),
      fetch(FIT_ADDON).then((r) => r.text()),
    ]);
    new Function(xtermCode)();
    new Function(fitCode)();
  } finally {
    win.define = savedDefine;
    win.require = savedRequire;
  }

  xtermLoaded = true;
}

export const Terminal: React.FC<TerminalProps> = ({
  backend,
  fontSize = 13,
  fontFamily = "'JetBrains Mono', 'Monaco', 'Menlo', monospace",
  scrollback = 10000,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        await loadXterm();
        if (disposed || !containerRef.current) return;

        const win = window as any;
        const XTerminal = win.Terminal?.Terminal || win.Terminal;
        const FitAddon = win.FitAddon?.FitAddon || win.FitAddon;

        if (!XTerminal) {
          setError("Failed to load xterm.js");
          return;
        }

        const fitAddon = new FitAddon();
        // Read theme colors from CSS custom properties
        const cs = getComputedStyle(document.documentElement);
        const bg =
          cs.getPropertyValue("--workspace-bg-primary").trim() || "#0d1117";
        const fg = cs.getPropertyValue("--text-primary").trim() || "#e6edf3";
        const sel =
          cs.getPropertyValue("--workspace-bg-active").trim() ||
          "rgba(177,186,196,0.12)";

        const term = new XTerminal({
          cursorBlink: true,
          fontSize,
          fontFamily,
          scrollback,
          theme: {
            background: bg,
            foreground: fg,
            cursor: fg,
            selectionBackground: sel,
          },
        });

        term.loadAddon(fitAddon);
        term.open(containerRef.current);
        fitAddon.fit();
        termRef.current = { term, fitAddon };

        // Connect backend
        const { rows, cols } = term;
        backend.connect({ rows, cols });

        // Wire I/O
        term.onData((data: string) => backend.send(data));
        backend.onData((data: string) => term.write(data));

        // Resize handling
        const observer = new ResizeObserver(() => {
          fitAddon.fit();
          backend.resize(term.rows, term.cols);
        });
        observer.observe(containerRef.current);

        setLoading(false);

        return () => {
          observer.disconnect();
          term.dispose();
          backend.disconnect();
        };
      } catch (e) {
        if (!disposed) setError(String(e));
      }
    })();

    return () => {
      disposed = true;
      if (termRef.current) {
        termRef.current.term.dispose();
        backend.disconnect();
      }
    };
  }, [backend, fontSize, fontFamily, scrollback]);

  return (
    <div className={`${CLS} ${className ?? ""}`} style={style}>
      {loading && !error && (
        <div className={`${CLS}__loading`}>
          <i className="fas fa-spinner fa-spin" /> Loading terminal...
        </div>
      )}
      {error && (
        <div className={`${CLS}__error`}>
          <i className="fas fa-exclamation-triangle" /> {error}
        </div>
      )}
      <div ref={containerRef} className={`${CLS}__container`} />
    </div>
  );
};
