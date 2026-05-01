#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/integration/test_public_api.py

"""Cross-module integration: package initialization, public API surface,
and the aggregate registration contract (every shipped component lands
in `_registry`)."""

import scitex_ui


class TestPublicAPI:
    def test_version(self):
        assert hasattr(scitex_ui, "__version__")
        # Validate semver format rather than hardcoding a specific version
        import re

        assert re.match(r"^\d+\.\d+\.\d+", scitex_ui.__version__)

    def test_exports(self):
        assert hasattr(scitex_ui, "get_component")
        assert hasattr(scitex_ui, "list_components")

    def test_register_component_accessible(self):
        # Available but not in __all__ (advanced use)
        assert hasattr(scitex_ui, "register_component")

    def test_all_contains_expected(self):
        expected = {
            "__version__",
            "get_component",
            "list_components",
            "get_static_dir",
            "get_docs_path",
        }
        assert expected == set(scitex_ui.__all__)

    def test_get_static_dir(self):
        static_dir = scitex_ui.get_static_dir()
        assert static_dir.is_dir()
        assert (static_dir / "ts").is_dir()
        assert (static_dir / "css").is_dir()

    def test_css_primitives_exist(self):
        css_dir = scitex_ui.get_static_dir() / "css" / "primitives"
        assert css_dir.is_dir()
        for name in ("spacing.css", "z-index.css", "typography.css"):
            assert (css_dir / name).is_file(), f"Missing {name}"

    def test_list_components_includes_sidebar(self):
        components = scitex_ui.list_components()
        assert "package-docs-sidebar" in components


class TestAllComponentsRegistered:
    """Importing scitex_ui must trigger registration of every component.

    Lives in tests/integration/ because it spans every component module
    in src/scitex_ui/_components/ — there is no single src counterpart.
    """

    def test_all_components_registered(self):
        names = scitex_ui.list_components()
        expected = {
            "app-shell",
            "confirm-modal",
            "data-table",
            "dropdown",
            "file-browser",
            "file-tabs",
            "media-viewer",
            "monaco-editor",
            "package-docs-sidebar",
            "resizer",
            "status-bar",
            "theme-provider",
            "tooltip",
        }
        assert expected.issubset(set(names)), f"missing: {expected - set(names)}"


# EOF
