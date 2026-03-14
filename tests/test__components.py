#!/usr/bin/env python3
"""Tests for component metadata definitions."""

from scitex_ui.components._package_docs_sidebar import PackageDocsSidebar
from scitex_ui._registry import get_component


class TestPackageDocsSidebar:
    def test_metadata_fields(self):
        assert PackageDocsSidebar.name == "package-docs-sidebar"
        assert PackageDocsSidebar.version == "0.1.0"
        assert PackageDocsSidebar.description
        assert PackageDocsSidebar.api_endpoint
        assert PackageDocsSidebar.ts_entry
        assert PackageDocsSidebar.css_file

    def test_registered_in_registry(self):
        result = get_component("package-docs-sidebar")
        assert result is PackageDocsSidebar

    def test_css_file_exists(self):
        from pathlib import Path
        import scitex_ui

        pkg_dir = Path(scitex_ui.__file__).parent
        css_path = pkg_dir / "static" / PackageDocsSidebar.css_file
        assert css_path.exists(), f"CSS file not found: {css_path}"

    def test_ts_entry_exists(self):
        from pathlib import Path
        import scitex_ui

        pkg_dir = Path(scitex_ui.__file__).parent
        ts_path = pkg_dir / "static" / (PackageDocsSidebar.ts_entry + ".ts")
        assert ts_path.exists(), f"TS entry not found: {ts_path}"
