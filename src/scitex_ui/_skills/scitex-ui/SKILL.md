---
description: Vanilla TS workspace shell framework + React app components for SciTeX apps. Use when building or customizing SciTeX workspace UIs, integrating shell panels, or using frontend components.
allowed-tools: mcp__scitex__ui_*
---

# scitex-ui — Workspace Shell Framework

Reusable frontend framework for SciTeX workspace apps.
**Shell = vanilla TypeScript. App content = React (optional).**

## Installation & import (two equivalent paths)

The same module is reachable via two install paths. Both forms work at
runtime; which one a user has depends on their install choice.

```python
# Standalone — pip install scitex-ui
import scitex_ui
scitex_ui.list_components(...)

# Umbrella — pip install scitex
import scitex.ui
scitex.ui.list_components(...)
```

`pip install scitex-ui` alone does NOT expose the `scitex` namespace;
`import scitex.ui` raises `ModuleNotFoundError`. To use the
`scitex.ui` form, also `pip install scitex`.

See [../../general/02_interface-python-api.md] for the ecosystem-wide
rule and empirical verification table.

```bash
pip install scitex-ui
# Development:
pip install -e /home/ywatanabe/proj/scitex-ui
```

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

| Tool | Purpose |
|------|---------|
| `skills_list` | List available skill pages |
| `skills_get` | Get a skill page by name |
