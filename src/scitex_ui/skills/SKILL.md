---
name: scitex-ui
description: React/TypeScript workspace shell and shared components for SciTeX apps
---

# scitex-ui Skills

Shared React/TypeScript component library for the SciTeX workspace.

## Components

| Component | Import | Purpose |
|-----------|--------|---------|
| `Workspace` | `scitex-ui/react/shell` | Full workspace frame (Console, FileTree, Viewer, App) |
| `DataTable` | `scitex-ui/react/app/data-table` | Spreadsheet with selection, editing, clipboard |
| `FileBrowser` | `scitex-ui/react/app/file-browser` | File tree with create/rename/delete |
| `MediaViewer` | `scitex-ui/react/app/media-viewer` | Image/PDF/text preview |
| `ModuleTabBar` | `scitex-ui/react/shell` | Multi-module tab switching |

## Bridge Infrastructure

Apps mount React into Django workspace via bridge:

```typescript
// bridge-init.ts
import { installFetchOverride } from "scitex-ui/bridge";
installFetchOverride("/apps/my-app/my-app");
```

## CSS Theme

Always use `--workspace-*` variables:

| Variable | Use |
|----------|-----|
| `--workspace-bg-primary` | Main background |
| `--workspace-bg-secondary` | Card/panel background |
| `--workspace-text-primary` | Main text |
| `--workspace-text-secondary` | Muted text |
| `--workspace-border-default` | Borders |

## Standalone Shell

```html
{% extends "scitex_ui/standalone_shell.html" %}
{% block app_content %}
    <div id="root"></div>
{% endblock %}
```

## Bundled Assets

- Monaco editor (14MB, offline) at `/static/scitex_ui/vendor/monaco-editor/`
- Shell CSS at `/static/scitex_ui/css/shell/`
- Panel resizer TS at `/static/scitex_ui/ts/shell/`
