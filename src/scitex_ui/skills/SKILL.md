---
name: scitex-ui
description: Vanilla TS workspace shell framework + React app components for SciTeX apps
---

# scitex-ui Skills

Reusable frontend framework for SciTeX workspace apps.
**Shell = vanilla TypeScript. App content = React (optional).**

## Architecture

```
ts/shell/          ← Vanilla TS workspace shell (single source of truth)
ts/app/            ← Vanilla TS app components (FileBrowser, DataTable)
react/app/         ← React app components (usePanelResize, DataTable)
css/shell/         ← Shell CSS (21 files)
templates/         ← Django HTML templates
```

## Shell Framework (Vanilla TS)

The workspace shell provides Console/Chat, File Tree, Viewer, and App Content panes.
All shell code is vanilla TypeScript with adapter interfaces for backend abstraction.

### Quick Start — initShell()

```typescript
import { initShell } from "scitex-ui/ts/shell";

await initShell({
  fileTree: {
    adapter: { fetchTree: () => fetch("/api/tree").then(r => r.json()).then(d => d.tree) },
    onFileSelect: (node) => console.log(node.path),
  },
  terminal: {
    adapter: { getWebSocketUrl: () => `ws://127.0.0.1:${port + 1}/` },
  },
  viewer: {
    adapter: { readFile: (p) => fetch(`/api/file/${p}`).then(r => r.json()), getFileUrl: (p) => `/api/file/${p}?raw=true` },
  },
});
```

### Shell Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `ShellFileTree` | `ts/shell/file-tree` | File tree with 60+ icons, git badges, hidden files toggle |
| `ToolbarManager` | `ts/shell/toolbar` | Button command events, keyboard shortcuts, Emacs chords |
| `initTerminal` | `ts/shell/terminal` | xterm.js factory, OSC escapes, clipboard, local vendor fallback |
| `processStream` | `ts/shell/chat` | SSE streaming, markdown rendering, tool tags, model badge |
| `ViewerManager` | `ts/shell/viewer` | Image zoom/pan, PDF.js, text with syntax highlighting |
| `AutoResponseManager` | `ts/shell/auto-response` | Claude Code CLI auto-accept (permission prompts) |

### Adapter Interfaces

| Adapter | Methods | Used by |
|---------|---------|---------|
| `FileTreeAdapter` | `fetchTree()`, `createFile?()`, `createFolder?()` | ShellFileTree |
| `TerminalConnectionAdapter` | `getWebSocketUrl()`, `onMessage?()` | initTerminal |
| `ViewerAdapter` | `readFile()`, `getFileUrl()`, `saveFile?()` | ViewerManager |
| `ChatAdapter` | `streamChat()`, `fetchCurrentModel?()` | processStream |
| `ConfigAdapter` | `fetchMcpPrefs?()`, `saveMcpPrefs?()`, `fetchSkills?()` | ConfigMode |

### Media Input Components

| Component | Purpose |
|-----------|---------|
| `WebcamCapture` | Camera modal with capture + flip |
| `SketchCanvas` | Freehand drawing (pen/eraser/color/width) exports PNG |
| `VoiceRecorder` | MediaRecorder + volume visualizer + SttAdapter |
| `ImageInputManager` | File picker, clipboard paste, thumbnails, base64 |

## Standalone Shell Template

```html
{% extends "scitex_ui/standalone_shell.html" %}
{% block app_content %}
    <div id="root"></div>
{% endblock %}
```

## App Components (React)

| Component | Import | Purpose |
|-----------|--------|---------|
| `DataTable` | `react/app/data-table` | Spreadsheet with selection, editing, clipboard |
| `FileBrowser` | `react/app/file-browser` | File tree (also available as vanilla TS) |
| `usePanelResize` | `react/app/usePanelResize` | Panel resize hook with collapse |
| `SelectorNav` | `react/app/selector-nav` | Icon grid navigation |

## CSS Theme Variables

| Variable | Use |
|----------|-----|
| `--bg-primary` | Main background |
| `--bg-secondary` | Panel/card background |
| `--fg-default` | Main text |
| `--fg-muted` | Secondary text |
| `--border-default` | Borders |
| `--terminal-bg` | Terminal background |
| `--terminal-fg` | Terminal text |

## Bundled Vendor Assets

- xterm.js (offline) at `/static/scitex_ui/vendor/xterm/`
- Monaco editor (offline) at `/static/scitex_ui/vendor/monaco-editor/`
