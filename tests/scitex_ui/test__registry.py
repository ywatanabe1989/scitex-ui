#!/usr/bin/env python3
"""Tests for component registry."""

from scitex_ui._registry import get_component, list_components, register_component


class TestRegisterComponent:
    def test_register_and_get(self):
        register_component("test-widget", {"version": "0.1.0"})
        result = get_component("test-widget")
        assert result == {"version": "0.1.0"}

    def test_get_nonexistent_returns_none(self):
        result = get_component("nonexistent-component")
        assert result is None

    def test_list_components_sorted(self):
        register_component("z-widget", {})
        register_component("a-widget", {})
        names = list_components()
        assert isinstance(names, list)
        assert names == sorted(names)

    def test_list_components_includes_registered(self):
        register_component("list-test-widget", {})
        names = list_components()
        assert "list-test-widget" in names
