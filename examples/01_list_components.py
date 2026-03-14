#!/usr/bin/env python3
"""Example: List all registered UI components and their metadata."""

from pathlib import Path

import scitex_ui

OUTPUT_DIR = Path(__file__).parent / "01_list_components_out"
OUTPUT_DIR.mkdir(exist_ok=True)

# List all registered components
components = scitex_ui.list_components()
print(f"Registered components ({len(components)}):")

lines = []
for name in components:
    meta = scitex_ui.get_component(name)
    info = f"  {name} v{meta.version} — {meta.description}"
    print(info)
    lines.append(info)

# Save output
output_file = OUTPUT_DIR / "components.txt"
output_file.write_text("\n".join(lines) + "\n")
print(f"\nSaved to {output_file}")
