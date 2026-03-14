#!/usr/bin/env python3
"""scitex-ui — Shared frontend UI components for the SciTeX ecosystem.

Components ship as TypeScript + CSS static assets, discoverable by Django's
AppDirectoriesFinder when added to INSTALLED_APPS.

Python API provides component metadata and registration.
"""

__version__ = "0.1.0"

from ._registry import get_component, list_components, register_component
from . import components as _components  # noqa: F401 — triggers registration

__all__ = ["get_component", "list_components", "register_component"]

# EOF
