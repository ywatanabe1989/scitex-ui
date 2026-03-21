#!/usr/bin/env python3
"""Tests for CLI commands."""

import json

import pytest

try:
    from click.testing import CliRunner

    from scitex_ui._cli import main

    HAS_CLICK = True
except ImportError:
    HAS_CLICK = False

pytestmark = pytest.mark.skipif(not HAS_CLICK, reason="click not installed")


@pytest.fixture
def runner():
    return CliRunner()


class TestCLIRoot:
    def test_help(self, runner):
        result = runner.invoke(main, ["--help"])
        assert result.exit_code == 0
        assert "SciTeX UI" in result.output

    def test_no_args_shows_help(self, runner):
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "SciTeX UI" in result.output

    def test_help_recursive(self, runner):
        result = runner.invoke(main, ["--help-recursive"])
        assert result.exit_code == 0
        assert "mcp" in result.output

    def test_version(self, runner):
        result = runner.invoke(main, ["--version"])
        assert result.exit_code == 0
        assert "scitex-ui" in result.output


class TestVersionCommand:
    def test_version(self, runner):
        result = runner.invoke(main, ["version"])
        assert result.exit_code == 0
        assert "scitex-ui" in result.output

    def test_version_json(self, runner):
        result = runner.invoke(main, ["version", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["package"] == "scitex-ui"
        assert "version" in data


class TestListPythonAPIs:
    def test_list_apis(self, runner):
        result = runner.invoke(main, ["list-python-apis"])
        assert result.exit_code == 0
        assert "get_component" in result.output

    def test_list_apis_verbose(self, runner):
        result = runner.invoke(main, ["list-python-apis", "-v"])
        assert result.exit_code == 0
        assert "(" in result.output  # signatures

    def test_list_apis_json(self, runner):
        result = runner.invoke(main, ["list-python-apis", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "total" in data
        assert "apis" in data
        names = [a["name"] for a in data["apis"]]
        assert "get_component" in names


class TestListComponents:
    def test_list_components(self, runner):
        result = runner.invoke(main, ["list-components"])
        assert result.exit_code == 0
        assert "components" in result.output

    def test_list_components_verbose(self, runner):
        result = runner.invoke(main, ["list-components", "-v"])
        assert result.exit_code == 0

    def test_list_components_json(self, runner):
        result = runner.invoke(main, ["list-components", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "total" in data
        names = [c["name"] for c in data["components"]]
        assert "theme-provider" in names


class TestMCPGroup:
    def test_mcp_help(self, runner):
        result = runner.invoke(main, ["mcp", "--help"])
        assert result.exit_code == 0
        assert "start" in result.output
        assert "doctor" in result.output

    def test_mcp_installation(self, runner):
        result = runner.invoke(main, ["mcp", "installation"])
        assert result.exit_code == 0
        assert "mcpServers" in result.output

    def test_mcp_installation_json(self, runner):
        result = runner.invoke(main, ["mcp", "installation", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["success"] is True
        assert "scitex-ui" in data["config"]["mcpServers"]
