#!/usr/bin/env python3
"""Tests for package initialization and public API."""

import scitex_ui


class TestPublicAPI:
    def test_version(self):
        assert hasattr(scitex_ui, "__version__")
        assert scitex_ui.__version__ == "0.1.0"

    def test_exports(self):
        assert hasattr(scitex_ui, "get_component")
        assert hasattr(scitex_ui, "list_components")

    def test_register_component_accessible(self):
        # Available but not in __all__ (advanced use)
        assert hasattr(scitex_ui, "register_component")

    def test_all_contains_expected(self):
        expected = {
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
