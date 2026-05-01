#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/scitex_ui/_mcp/test_server.py

"""Tests for scitex_ui._mcp.server — MCP smoke + tool invocation."""

import asyncio
import json

import pytest

try:
    from scitex_ui._mcp.server import mcp, ui_skills_get, ui_skills_list

    HAS_MCP = True
except ImportError:  # pragma: no cover — fastmcp optional
    HAS_MCP = False

pytestmark = pytest.mark.skipif(not HAS_MCP, reason="fastmcp not installed")


# ---------------------------------------------------------------------------
# Server / list_tools smoke
# ---------------------------------------------------------------------------


def test_server_name():
    assert mcp.name == "scitex-ui"


def test_list_tools_async_returns_expected_tools():
    """mcp.list_tools() exposes both audit-mcp-tools §5 skills tools."""
    tools = asyncio.run(mcp.list_tools())
    names = {t.name for t in tools}
    assert "ui_skills_list" in names, f"missing ui_skills_list, got {names}"
    assert "ui_skills_get" in names, f"missing ui_skills_get, got {names}"


def test_list_tools_have_descriptions():
    tools = asyncio.run(mcp.list_tools())
    for t in tools:
        assert t.description, f"tool {t.name} has empty description"


# ---------------------------------------------------------------------------
# Direct function invocation (sync) — exercises the JSON envelope contract
# ---------------------------------------------------------------------------


def test_ui_skills_list_returns_known_skills():
    raw = ui_skills_list.fn() if hasattr(ui_skills_list, "fn") else ui_skills_list()
    payload = json.loads(raw)
    assert payload["success"] is True
    assert payload["package"] == "scitex-ui"
    assert isinstance(payload["skills"], list)
    # The repo ships at least the 01_python-api skill page.
    assert "01_python-api" in payload["skills"]


def test_ui_skills_get_known_page():
    fn = ui_skills_get.fn if hasattr(ui_skills_get, "fn") else ui_skills_get
    raw = fn(name="01_python-api")
    payload = json.loads(raw)
    assert payload["success"] is True
    assert payload["name"] == "01_python-api"
    assert isinstance(payload["content"], str)
    assert payload["content"].strip(), "skill content must be non-empty"


def test_ui_skills_get_unknown_page_reports_available():
    fn = ui_skills_get.fn if hasattr(ui_skills_get, "fn") else ui_skills_get
    raw = fn(name="this-skill-does-not-exist")
    payload = json.loads(raw)
    assert payload["success"] is False
    assert "available" in payload["error"]


# ---------------------------------------------------------------------------
# End-to-end async tool invocation through the registered MCP machinery
# ---------------------------------------------------------------------------


def test_call_tool_ui_skills_list_via_mcp():
    """Exercise mcp.call_tool() — the path the actual MCP transport takes."""
    result = asyncio.run(mcp.call_tool("ui_skills_list", {}))
    text = result.content[0].text
    payload = json.loads(text)
    assert payload["success"] is True
    assert "skills" in payload


def test_call_tool_ui_skills_get_via_mcp():
    result = asyncio.run(mcp.call_tool("ui_skills_get", {"name": "01_python-api"}))
    text = result.content[0].text
    payload = json.loads(text)
    assert payload["success"] is True
    assert payload["name"] == "01_python-api"


# EOF
