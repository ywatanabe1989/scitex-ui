/**
 * Standalone Terminal — vanilla TS xterm.js initialization for the shell.
 *
 * Loads xterm.js + FitAddon from CDN, creates a terminal instance,
 * and connects via WebSocket to a local PTY server.
 *
 * Ported from scitex-cloud's console-terminal-factory.ts.
 * Used by standalone apps (figrecipe, etc.) via the Django standalone_shell.html.
 *
 * Usage: import this module — auto-initializes on DOMContentLoaded.
 * The terminal container must have id="stx-shell-ai-console-terminal".
 * The WebSocket URL is derived from the page port + 1.
 */

// Local vendor copies (offline-capable), with CDN fallback
const XTERM_JS_LOCAL = "/static/scitex_ui/vendor/xterm/xterm.js";
const XTERM_CSS_LOCAL = "/static/scitex_ui/vendor/xterm/xterm.css";
const FIT_ADDON_LOCAL = "/static/scitex_ui/vendor/xterm/xterm-addon-fit.js";
const XTERM_JS_CDN = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js";
const XTERM_CSS_CDN = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css";
const FIT_ADDON_CDN =
  "https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js";

const RECONNECT_DELAY = 3000;

interface TerminalInstance {
  terminal: any;
  fitAddon: any;
  ws: WebSocket | null;
  connected: boolean;
  resizeObserver: ResizeObserver | null;
  resizeTimeout: ReturnType<typeof setTimeout> | null;
}

/* ── xterm.js loader (AMD-safe) ──────────────────────────────── */

let cachedTerminal: any = null;
let cachedFitAddon: any = null;

async function loadXtermModules(): Promise<{
  Terminal: any;
  FitAddon: any;
}> {
  if (cachedTerminal)
    return { Terminal: cachedTerminal, FitAddon: cachedFitAddon };

  const win = window as any;

  // Try local vendor first, fall back to CDN
  async function fetchWithFallback(
    local: string,
    cdn: string,
  ): Promise<string> {
    try {
      const resp = await fetch(local);
      if (resp.ok) return resp.text();
    } catch {
      /* local not available */
    }
    return fetch(cdn).then((r) => r.text());
  }

  const [xtermCode, fitCode] = await Promise.all([
    fetchWithFallback(XTERM_JS_LOCAL, XTERM_JS_CDN),
    fetchWithFallback(FIT_ADDON_LOCAL, FIT_ADDON_CDN),
  ]);

  // Disable AMD/require to prevent conflicts with other loaders
  const savedDefine = win.define;
  const savedRequire = win.require;
  win.define = undefined;
  win.require = undefined;
  try {
    new Function(xtermCode)();
    new Function(fitCode)();
  } finally {
    win.define = savedDefine;
    win.require = savedRequire;
  }

  cachedTerminal = win.Terminal?.Terminal || win.Terminal;
  cachedFitAddon = win.FitAddon?.FitAddon || win.FitAddon;
  return { Terminal: cachedTerminal, FitAddon: cachedFitAddon };
}

function loadXtermCSS(): void {
  // Check if already loaded (either local or CDN)
  if (document.querySelector('link[href*="xterm.css"]')) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = XTERM_CSS_LOCAL;
  el.onerror = () => {
    el.href = XTERM_CSS_CDN;
  };
  document.head.appendChild(el);
}

function getTerminalTheme(): Record<string, string> {
  const s = getComputedStyle(document.documentElement);
  const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  return {
    background: get("--terminal-bg", "#0d1117"),
    foreground: get("--terminal-fg", "#c9d1d9"),
    cursor: get("--terminal-cursor", "#58a6ff"),
  };
}

/* ── Terminal creation ───────────────────────────────────────── */

function createTerminal(
  container: HTMLElement,
  TerminalClass: any,
  FitAddonClass: any,
): TerminalInstance {
  const terminal = new TerminalClass({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Monaco', 'Menlo', monospace",
    theme: getTerminalTheme(),
    scrollback: 10000,
  });

  terminal.open(container);

  const inst: TerminalInstance = {
    terminal,
    fitAddon: null,
    ws: null,
    connected: false,
    resizeObserver: null,
    resizeTimeout: null,
  };

  if (FitAddonClass) {
    inst.fitAddon = new FitAddonClass();
    terminal.loadAddon(inst.fitAddon);
    try {
      inst.fitAddon.fit();
    } catch {
      /* container may be hidden */
    }

    let lastW = 0;
    let lastH = 0;
    inst.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (Math.abs(width - lastW) < 2 && Math.abs(height - lastH) < 2) return;
      lastW = width;
      lastH = height;
      if (inst.resizeTimeout) clearTimeout(inst.resizeTimeout);
      inst.resizeTimeout = setTimeout(() => {
        try {
          inst.fitAddon.fit();
          sendResize(inst);
        } catch {
          /* ignore */
        }
      }, 150);
    });
    inst.resizeObserver.observe(container);
  }

  // User input → WebSocket
  terminal.onData((data: string) => {
    if (inst.ws?.readyState === WebSocket.OPEN) inst.ws.send(data);
  });

  return inst;
}

/* ── WebSocket connection ────────────────────────────────────── */

function sendResize(inst: TerminalInstance): void {
  if (
    inst.ws?.readyState === WebSocket.OPEN &&
    inst.terminal.rows &&
    inst.terminal.cols
  ) {
    inst.ws.send(`resize:${inst.terminal.rows}:${inst.terminal.cols}`);
  }
}

function connectTerminal(inst: TerminalInstance): void {
  if (inst.connected) return;

  const port = parseInt(window.location.port || "5050", 10);
  const wsUrl = `ws://127.0.0.1:${port + 1}/`;

  console.log(`[standalone-terminal] Connecting to ${wsUrl}`);
  inst.ws = new WebSocket(wsUrl);

  inst.ws.onopen = () => {
    inst.connected = true;
    sendResize(inst);
    console.log("[standalone-terminal] Connected");
  };

  inst.ws.onmessage = (ev) => {
    inst.terminal.write(ev.data);
  };

  inst.ws.onerror = () => {
    console.warn("[standalone-terminal] WebSocket error");
  };

  inst.ws.onclose = () => {
    inst.connected = false;
    console.log(
      `[standalone-terminal] Disconnected, reconnecting in ${RECONNECT_DELAY}ms`,
    );
    setTimeout(() => connectTerminal(inst), RECONNECT_DELAY);
  };
}

/* ── Auto-initialization ─────────────────────────────────────── */

async function initStandaloneTerminal(): Promise<void> {
  const container = document.getElementById("stx-shell-ai-console-terminal");
  if (!container) {
    console.log("[standalone-terminal] No terminal container found, skipping");
    return;
  }

  loadXtermCSS();
  const { Terminal, FitAddon } = await loadXtermModules();
  if (!Terminal) {
    console.error("[standalone-terminal] Failed to load xterm.js");
    return;
  }

  const inst = createTerminal(container, Terminal, FitAddon);
  connectTerminal(inst);

  console.log("[standalone-terminal] Initialized");
}

// Auto-init on DOMContentLoaded or immediately if DOM already ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStandaloneTerminal);
  } else {
    initStandaloneTerminal();
  }
}

export { initStandaloneTerminal, loadXtermModules, loadXtermCSS };
