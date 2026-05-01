#!/usr/bin/env python3
"""List all registered scitex-ui components and their metadata.

Usage:
    python 01_list_components.py
"""

from pathlib import Path

import scitex_ui

OUTPUT_DIR = Path(__file__).parent / "01_list_components_out"


def main() -> int:
    OUTPUT_DIR.mkdir(exist_ok=True)

    components = scitex_ui.list_components()
    print(f"Registered components ({len(components)}):")

    lines = []
    for name in components:
        meta = scitex_ui.get_component(name)
        info = f"  {name} v{meta.version} — {meta.description}"
        print(info)
        lines.append(info)

    output_file = OUTPUT_DIR / "components.txt"
    output_file.write_text("\n".join(lines) + "\n")
    print(f"\nSaved to {output_file}")

    return 0


if __name__ == "__main__":
    main()
