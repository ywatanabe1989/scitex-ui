#!/usr/bin/env python3
"""Example: Inspect workspace frame component metadata."""

from pathlib import Path

import scitex_ui

OUTPUT_DIR = Path(__file__).parent / "02_workspace_components_out"
OUTPUT_DIR.mkdir(exist_ok=True)

WORKSPACE_COMPONENTS = [
    "theme-provider",
    "app-shell",
    "file-browser",
    "status-bar",
]

lines = []
print("Workspace Frame Components:")
print("=" * 50)

for name in WORKSPACE_COMPONENTS:
    meta = scitex_ui.get_component(name)
    if meta is None:
        print(f"  {name}: NOT REGISTERED")
        continue
    line = f"  {name} v{meta.version}"
    print(line)
    print(f"    {meta.description}")
    print(f"    CSS: {meta.css_file}")
    print(f"    TS:  {meta.ts_entry}")
    print()
    lines.append(f"{name} v{meta.version} — {meta.description}")

output_file = OUTPUT_DIR / "workspace_components.txt"
output_file.write_text("\n".join(lines) + "\n")
print(f"Saved to {output_file}")
