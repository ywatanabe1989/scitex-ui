#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/scitex_ui/_components/test__package_docs_sidebar.py

"""Tests for scitex_ui._components._package_docs_sidebar."""

from scitex_ui._components._package_docs_sidebar import PackageDocsSidebar


class TestPackageDocsSidebar:
    def test_metadata_and_files(self, check_metadata):
        check_metadata(PackageDocsSidebar)
        # Sidebar exposes an additional API endpoint for docs serving.
        assert PackageDocsSidebar.api_endpoint


# EOF
