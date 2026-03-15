#!/usr/bin/env python3
"""Tests for component metadata definitions."""

from pathlib import Path

import scitex_ui
from scitex_ui._registry import get_component
from scitex_ui._components._app_shell import AppShell
from scitex_ui._components._file_browser import FileBrowser
from scitex_ui._components._package_docs_sidebar import PackageDocsSidebar
from scitex_ui._components._status_bar import StatusBar
from scitex_ui._components._theme_provider import ThemeProvider

PKG_DIR = Path(scitex_ui.__file__).parent


def _check_metadata(cls):
    """Verify common metadata fields and file existence."""
    assert cls.name
    assert cls.version == "0.1.0"
    assert cls.description
    assert cls.ts_entry
    assert cls.css_file

    # Registered in registry
    assert get_component(cls.name) is cls

    # CSS file exists
    css_path = PKG_DIR / "static" / cls.css_file
    assert css_path.exists(), f"CSS not found: {css_path}"

    # TS entry exists
    ts_path = PKG_DIR / "static" / (cls.ts_entry + ".ts")
    assert ts_path.exists(), f"TS entry not found: {ts_path}"


class TestPackageDocsSidebar:
    def test_metadata_and_files(self):
        _check_metadata(PackageDocsSidebar)
        assert PackageDocsSidebar.api_endpoint


class TestThemeProvider:
    def test_metadata_and_files(self):
        _check_metadata(ThemeProvider)


class TestAppShell:
    def test_metadata_and_files(self):
        _check_metadata(AppShell)


class TestFileBrowser:
    def test_metadata_and_files(self):
        _check_metadata(FileBrowser)


class TestStatusBar:
    def test_metadata_and_files(self):
        _check_metadata(StatusBar)


class TestResizer:
    def test_metadata_and_files(self):
        from scitex_ui._components._resizer import Resizer

        _check_metadata(Resizer)


class TestMediaViewer:
    def test_metadata_and_files(self):
        from scitex_ui._components._media_viewer import MediaViewer

        _check_metadata(MediaViewer)


class TestConfirmModal:
    def test_metadata_and_files(self):
        from scitex_ui._components._confirm_modal import ConfirmModal

        _check_metadata(ConfirmModal)


class TestAllComponentsRegistered:
    def test_eight_components_registered(self):
        names = scitex_ui.list_components()
        expected = {
            "app-shell",
            "confirm-modal",
            "file-browser",
            "media-viewer",
            "package-docs-sidebar",
            "resizer",
            "status-bar",
            "theme-provider",
        }
        assert expected.issubset(set(names))
