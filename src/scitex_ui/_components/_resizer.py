#!/usr/bin/env python3
"""Resizer component metadata."""

from .._registry import register_component


class Resizer:
    name = "resizer"
    version = "0.1.0"
    description = "Draggable panel divider with collapse, snap, and persistence"
    ts_entry = "scitex_ui/ts/shell/resizer/index"
    css_file = "scitex_ui/css/shell/resizer.css"


register_component(Resizer.name, Resizer)
