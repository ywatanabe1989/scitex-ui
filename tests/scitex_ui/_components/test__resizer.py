#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/scitex_ui/_components/test__resizer.py

"""Tests for scitex_ui._components._resizer."""

from scitex_ui._components._resizer import Resizer


class TestResizer:
    def test_metadata_and_files(self, check_metadata):
        check_metadata(Resizer)


# EOF
