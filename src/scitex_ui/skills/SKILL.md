---
name: scitex-ui
description: Vanilla TS workspace shell framework + React app components for SciTeX apps. Use when building or customizing SciTeX workspace UIs, integrating shell panels, or using frontend components.
allowed-tools: mcp__scitex__ui_*
---

# scitex-ui — Workspace Shell Framework

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

## Quick Start — Shell

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

## Quick Start — Django Template

```html
{% extends "scitex_ui/standalone_shell.html" %}
{% block app_content %}
    <div id="root"></div>
{% endblock %}
```

## Python API

```python
from scitex_ui import list_components, get_component, get_static_dir, get_docs_path

# List all 12 registered components
list_components()  # ['app-shell', 'data-table', 'file-browser', ...]

# Get component metadata
get_component("data-table")  # {name, version, description, ts_entry, css_file}

# Get paths for Django integration
get_static_dir()  # Path to static assets (css/, ts/)
get_docs_path()   # Path to documentation
```

| Function | Purpose |
|----------|---------|
| `list_components()` | List all 12 registered component names |
| `get_component(name)` | Get metadata for a component |
| `get_static_dir()` | Path to static assets directory |
| `get_docs_path()` | Path to documentation |
| `register_component()` | Register a custom component |

## Shell Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `ShellFileTree` | `ts/shell/file-tree` | File tree with 60+ icons, git badges, hidden files toggle |
| `ToolbarManager` | `ts/shell/toolbar` | Button command events, keyboard shortcuts, Emacs chords |
| `initTerminal` | `ts/shell/terminal` | xterm.js factory, OSC escapes, clipboard |
| `processStream` | `ts/shell/chat` | SSE streaming, markdown rendering, tool tags |
| `ViewerManager` | `ts/shell/viewer` | Image zoom/pan, PDF.js, syntax highlighting |
| `AutoResponseManager` | `ts/shell/auto-response` | Claude Code CLI auto-accept |

## Adapter Interfaces

| Adapter | Methods | Used by |
|---------|---------|---------|
| `FileTreeAdapter` | `fetchTree()`, `createFile?()`, `createFolder?()` | ShellFileTree |
| `TerminalConnectionAdapter` | `getWebSocketUrl()`, `onMessage?()` | initTerminal |
| `ViewerAdapter` | `readFile()`, `getFileUrl()`, `saveFile?()` | ViewerManager |
| `ChatAdapter` | `streamChat()`, `fetchCurrentModel?()` | processStream |
| `ConfigAdapter` | `fetchMcpPrefs?()`, `saveMcpPrefs?()` | ConfigMode |

## App Components (React)

| Component | Import | Purpose |
|-----------|--------|---------|
| `DataTable` | `react/app/data-table` | Spreadsheet with selection, editing, clipboard |
| `FileBrowser` | `react/app/file-browser` | File tree (also available as vanilla TS) |
| `usePanelResize` | `react/app/usePanelResize` | Panel resize hook with collapse |
| `SelectorNav` | `react/app/selector-nav` | Icon grid navigation |

## Media Input Components

| Component | Purpose |
|-----------|---------|
| `WebcamCapture` | Camera modal with capture + flip |
| `SketchCanvas` | Freehand drawing exports PNG |
| `VoiceRecorder` | MediaRecorder + volume visualizer |
| `ImageInputManager` | File picker, clipboard paste, thumbnails |

## CLI Commands

```bash
# MCP server
scitex-ui mcp start
scitex-ui mcp doctor
scitex-ui mcp list-tools
scitex-ui mcp installation

# Documentation & Skills (via scitex-dev)
scitex-ui docs
scitex-ui skills list
scitex-ui skills get SKILL
```

## MCP Tools (for AI agents)

| Tool | Purpose |
|------|---------|
| `skills_list` | List available skill pages |
| `skills_get` | Get a skill page by name |

## Django Integration

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    "scitex_ui",
]
```

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
