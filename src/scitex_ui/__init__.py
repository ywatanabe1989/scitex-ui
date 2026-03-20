#!/usr/bin/env python3
"""scitex-ui — Shared frontend UI components for the SciTeX ecosystem.

Components ship as TypeScript + CSS static assets, discoverable by Django's
AppDirectoriesFinder when added to INSTALLED_APPS.

Python API provides component metadata and registration.
"""

__version__ = "0.1.0"

from pathlib import Path as _Path

from ._registry import get_component, list_components
from ._registry import register_component as _register_component
from . import _components  # noqa: F401 — triggers registration

# Advanced: re-export for custom component authors
register_component = _register_component


def get_static_dir() -> _Path:
    """Return the absolute path to scitex_ui's static asset directory.

    This is the directory containing ``css/`` and ``ts/`` subdirectories.
    Works for both pip-installed packages and editable (dev) installs.

    Useful for build tools (Vite, Webpack) that need to resolve
    scitex-ui source files at build time.

    Returns
    -------
    pathlib.Path
        e.g. ``/usr/lib/python3.11/.../scitex_ui/static/scitex_ui``
    """
    return _Path(__file__).parent / "static" / "scitex_ui"


def get_docs_path() -> _Path:
    """Return the absolute path to scitex_ui's bundled documentation directory.

    The directory contains ``APP_DEVELOPER_GUIDE.md`` and the Sphinx-built
    HTML docs. Works for both pip-installed packages and editable (dev) installs.

    Returns
    -------
    pathlib.Path
        e.g. ``/usr/lib/python3.11/.../scitex_ui/_docs``
    """
    return _Path(__file__).parent / "_docs"


__all__ = ["get_component", "list_components", "get_static_dir", "get_docs_path"]

# EOF
