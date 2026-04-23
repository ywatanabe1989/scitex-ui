---
description: Shared frontend framework for SciTeX web apps — vanilla TypeScript workspace shell (single source of truth) + optional React app components + Django static-asset integration. Ships `ts/shell/` (initShell, adapters, panel resize), `ts/app/` (vanilla app components), `react/app/` (`usePanelResize`, `DataTable`), `css/shell/` (design tokens, dark/light theme), and Django `templates/`. Python API — `list_components()` / `get_component(name)` / `register_component()` (component registry), `get_static_dir()` (build-tool static root — Vite/Webpack), `get_docs_path()` (bundled Sphinx HTML). Add `scitex_ui` to `INSTALLED_APPS` so `AppDirectoriesFinder` discovers CSS/TS. 4 MCP tools exposed via the scitex umbrella — `ui_inspect_element(selector)` / `ui_inspect_elements(selector)` (Playwright-based live DOM introspection — bbox, computed styles, text, attrs), `ui_notify(title, body, level)` (desktop/browser notification), `ui_get_notification_config()`. Drop-in replacement for hand-writing Django static directories + duplicating panel-resize hooks across apps + per-project CSS theme variables + manual Playwright DOM queries. Use whenever the user asks to "build a SciTeX workspace app", "add panel resizing", "share a React DataTable", "theme with design tokens", "set up Django static asset discovery for scitex-ui", "inspect a DOM element in the live app", "send a desktop notification from the web UI", "integrate the shell framework", or mentions workspace shell, initShell, usePanelResize, Bridge infrastructure, scitex-ui.
allowed-tools: mcp__scitex__ui_*
---

# scitex-ui — Workspace Shell Framework

Reusable frontend framework for SciTeX workspace apps.
**Shell = vanilla TypeScript. App content = React (optional).**

## Installation & import

```python
import scitex_ui                # pip install scitex-ui
# or:  import scitex.ui         # pip install scitex  (umbrella)
```

See [../../general/02_interface-python-api.md] for the dual-install rule.

## Sub-skills

### Core (01–09)
- [01_python-api.md](01_python-api.md) — Python API: `list_components`, `get_component`, `get_static_dir`, Django integration
- [02_cli.md](02_cli.md) — CLI commands: `scitex-ui mcp`, `docs`, `skills`

### Standards (20–29)
- [20_css-theme.md](20_css-theme.md) — CSS design tokens, theme variables, dark/light mode

### Architecture (30–39)
- [30_shell-framework.md](30_shell-framework.md) — Workspace shell framework overview
- [31_shell-modules.md](31_shell-modules.md) — `initShell`, adapters, TypeScript shell module API
- [32_frontend-components.md](32_frontend-components.md) — React app components, Bridge infrastructure, panel resize

## Architecture

```
ts/shell/          ← Vanilla TS workspace shell (single source of truth)
ts/app/            ← Vanilla TS app components
react/app/         ← React app components (usePanelResize, DataTable)
css/shell/         ← Shell CSS
templates/         ← Django HTML templates
```

## MCP Tools

Exposed via the umbrella `scitex` MCP server (registered by `scitex._mcp_tools.ui.register_ui_tools`):

| Tool | Purpose |
|------|---------|
| `ui_inspect_element` | Introspect one DOM element in the live playwright-cli browser — bbox, computed styles, attrs, parent chain, matching CSS rules |
| `ui_inspect_elements` | Bulk-inspect all elements matching a selector (with `limit`) |
| `ui_notify` | Send a UI-level alert via scitex-notification (audio / desktop / email / webhook / Telegram / Twilio fallback) |
| `ui_get_notification_config` | Show active notification config (fallback order, level routing, timeouts) |

Standalone `scitex-ui` MCP server also exposes:

| Tool | Purpose |
|------|---------|
| `skills_list` | List available skill pages |
| `skills_get` | Get a skill page by name |
