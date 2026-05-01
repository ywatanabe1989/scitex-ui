#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/scitex_ui/_components/test__monaco_editor.py

"""Tests for scitex_ui._components._monaco_editor.

MonacoEditor is special-cased: it has no CSS file (Monaco styles are
imported via JS), so we skip the standard `check_metadata` helper and
verify the remaining contract by hand.
"""

from pathlib import Path

import scitex_ui
from scitex_ui._components._monaco_editor import MonacoEditor
from scitex_ui._registry import get_component

PKG_DIR = Path(scitex_ui.__file__).parent


class TestMonacoEditor:
    def test_metadata_fields(self):
        assert MonacoEditor.name == "monaco-editor"
        assert MonacoEditor.version == "0.1.0"
        assert MonacoEditor.description
        assert MonacoEditor.ts_entry
        # Monaco CSS is imported via JS — css_file is intentionally None.
        assert MonacoEditor.css_file is None

    def test_registered(self):
        assert get_component("monaco-editor") is MonacoEditor

    def test_ts_entry_exists(self):
        ts_path = PKG_DIR / "static" / (MonacoEditor.ts_entry + ".ts")
        assert ts_path.exists(), f"TS entry not found: {ts_path}"


# EOF
