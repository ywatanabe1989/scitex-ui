#!/usr/bin/env python3
"""Tests for CLI commands."""

import json

import pytest

# click is an optional dep (scitex-ui[cli]); skip the whole module if it
# isn't installed so pytest collection stays green (PA-303).
pytest.importorskip("click")

from click.testing import CliRunner  # noqa: E402
from scitex_ui._cli import main  # noqa: E402


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


# Bare `version` subcommand was removed (audit-cli §1b — `--version`/-V
# is the canonical flag). Coverage of the version surface is in
# TestCLIRoot.test_version.


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
        # Schema is {"module": "...", "apis": [...]} — no "total" key.
        assert data["module"] == "scitex_ui"
        assert "apis" in data
        names = [a["name"] for a in data["apis"]]
        assert "get_component" in names


# `list-components` subcommand is not yet implemented in scitex_ui._cli.
# Tests deferred until the surface lands.


class TestMCPGroup:
    def test_mcp_help(self, runner):
        result = runner.invoke(main, ["mcp", "--help"])
        assert result.exit_code == 0
        assert "start" in result.output
        assert "doctor" in result.output

    def test_mcp_show_installation(self, runner):
        # Canonical leaf is `show-installation` (§3 mcp install was renamed
        # but scitex-ui still uses the show-installation name).
        result = runner.invoke(main, ["mcp", "show-installation"])
        assert result.exit_code == 0
        assert "mcpServers" in result.output

    def test_mcp_show_installation_json(self, runner):
        result = runner.invoke(main, ["mcp", "show-installation", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["success"] is True
        assert "scitex-ui" in data["config"]["mcpServers"]
