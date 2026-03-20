#!/usr/bin/env python3
"""ConfirmModal component metadata."""

from .._registry import register_component


class ConfirmModal:
    name = "confirm-modal"
    version = "0.1.0"
    description = "Modern confirmation dialog replacing window.confirm()"
    ts_entry = "scitex_ui/ts/app/confirm-modal/index"
    css_file = "scitex_ui/css/app/confirm-modal.css"


register_component(ConfirmModal.name, ConfirmModal)
