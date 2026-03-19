/**
 * MonacoView — Monaco editor for text file viewing.
 *
 * Loading strategy:
 * 1. Local: /static/scitex_ui/vendor/monaco-editor/vs/ (bundled in scitex-ui)
 * 2. Fallback: CDN (https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min)
 */

import React, { useRef, useEffect, useState } from "react";
import { LANGUAGE_MAP } from "./types";

const MONACO_LOCAL = "/static/scitex_ui/vendor/monaco-editor/vs";
const MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";
let monacoLoaded = false;

/** Try local first, fall back to CDN */
async function resolveMonacoBase(): Promise<string> {
  try {
    const resp = await fetch(`${MONACO_LOCAL}/loader.js`, { method: "HEAD" });
    if (resp.ok) return MONACO_LOCAL;
  } catch {
    // local not available
  }
  return MONACO_CDN;
}

async function loadMonaco(): Promise<void> {
  if (monacoLoaded) return;
  if ((window as any).monaco) {
    monacoLoaded = true;
    return;
  }

  const base = await resolveMonacoBase();

  // Load Monaco loader
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base}/loader.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Monaco loader"));
    document.head.appendChild(script);
  });

  // Configure and load Monaco
  const require = (window as any).require;
  require.config({ paths: { vs: base } });

  await new Promise<void>((resolve) => {
    require(["vs/editor/editor.main"], () => {
      monacoLoaded = true;
      resolve();
    });
  });
}

function detectLanguage(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

interface MonacoViewProps {
  content: string;
  filePath: string;
  readOnly?: boolean;
}

export const MonacoView: React.FC<MonacoViewProps> = ({
  content,
  filePath,
  readOnly = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const language = detectLanguage(filePath);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        await loadMonaco();
        if (disposed || !containerRef.current) return;

        const monaco = (window as any).monaco;
        if (!monaco) {
          setError("Monaco not available");
          return;
        }

        // Read theme from CSS
        const isDark =
          document.documentElement.getAttribute("data-theme") === "dark";

        editorRef.current = monaco.editor.create(containerRef.current, {
          value: content,
          language,
          readOnly,
          theme: isDark ? "vs-dark" : "vs",
          fontSize: 13,
          fontFamily: "'JetBrains Mono', Monaco, Menlo, monospace",
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
        });

        setLoading(false);
      } catch (e) {
        if (!disposed) setError(String(e));
      }
    })();

    return () => {
      disposed = true;
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [content, language, readOnly]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {loading && !error && (
        <div
          style={{
            padding: 16,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          <i className="fas fa-spinner fa-spin" /> Loading editor...
        </div>
      )}
      {error && (
        <div
          style={{ padding: 16, color: "var(--status-error)", fontSize: 13 }}
        >
          <i className="fas fa-exclamation-triangle" /> {error}
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
