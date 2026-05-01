#!/usr/bin/env python3
"""Quickstart for scitex-ui: list registered components and inspect static dirs.

Usage:
    python quickstart.py
"""

from pathlib import Path

import scitex_ui


def main() -> int:
    print(f"scitex_ui version: {scitex_ui.__version__}")

    components = scitex_ui.list_components()
    print(f"\nregistered components ({len(components)}):")
    for name in components:
        meta = scitex_ui.get_component(name)
        print(f"  - {name} v{meta.version} — {meta.description}")

    static_dir = Path(scitex_ui.get_static_dir())
    docs_path = Path(scitex_ui.get_docs_path())
    print(f"\nstatic dir: {static_dir}  (exists: {static_dir.exists()})")
    print(f"docs path:  {docs_path}  (exists: {docs_path.exists()})")

    return 0


if __name__ == "__main__":
    main()
