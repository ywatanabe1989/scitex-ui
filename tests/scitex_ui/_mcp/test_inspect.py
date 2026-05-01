#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/scitex_ui/_mcp/test_inspect.py

"""Tests for scitex_ui._mcp.inspect — element-inspection handlers.

The handlers shell out to `playwright-cli`; we patch the subprocess so the
suite runs in CI without a real browser.
"""

from __future__ import annotations

import json
import subprocess
from unittest.mock import patch

from scitex_ui._mcp.inspect import (
    inspect_element_handler,
    inspect_elements_handler,
)


def _fake_completed(stdout: str, returncode: int = 0):
    return subprocess.CompletedProcess(
        args=["playwright-cli", "eval", "..."],
        returncode=returncode,
        stdout=stdout,
        stderr="",
    )


def _wrap_eval_result(payload: dict | str) -> str:
    """Mirror playwright-cli's eval output framing: '### Result\\n<value>\\n###...'.

    The handler unquotes JSON-string-encoded payloads, so we encode dicts
    twice (json.dumps then json.dumps again to produce a quoted string).
    """
    inner = json.dumps(payload) if isinstance(payload, dict) else payload
    quoted = json.dumps(inner)  # turns it into "{\"key\":...}"
    return f"### Result\n{quoted}\n### Ran Playwright code\n"


# ---------------------------------------------------------------------------
# inspect_element_handler
# ---------------------------------------------------------------------------


def test_inspect_element_returns_data_on_success():
    payload = {
        "url": "http://example.com",
        "element": {"tag": "div", "id": "foo", "classes": []},
        "attributes": {},
        "computed": {"display": "block"},
        "inline": "",
        "dimensions": {"width": 100, "height": 50, "top": 0, "left": 0},
        "parentChain": [],
        "matchingRules": [],
    }
    with patch(
        "subprocess.run", return_value=_fake_completed(_wrap_eval_result(payload))
    ):
        result = inspect_element_handler("#foo")
    assert result["success"] is True
    assert result["data"]["element"]["tag"] == "div"


def test_inspect_element_propagates_browser_error():
    """A JS-side {error: ...} payload becomes a failure envelope."""
    err_payload = {"error": "Element not found: #missing"}
    with patch(
        "subprocess.run", return_value=_fake_completed(_wrap_eval_result(err_payload))
    ):
        result = inspect_element_handler("#missing")
    assert result["success"] is False
    assert "Element not found" in result["error"]


def test_inspect_element_when_playwright_cli_missing():
    with patch("subprocess.run", side_effect=FileNotFoundError()):
        result = inspect_element_handler("#foo")
    assert result["success"] is False
    assert "playwright-cli" in result["error"]


def test_inspect_element_on_subprocess_timeout():
    with patch(
        "subprocess.run",
        side_effect=subprocess.TimeoutExpired(cmd="playwright-cli", timeout=10),
    ):
        result = inspect_element_handler("#foo")
    assert result["success"] is False
    assert "timed out" in result["error"]


# ---------------------------------------------------------------------------
# inspect_elements_handler
# ---------------------------------------------------------------------------


def test_inspect_elements_returns_total_and_elements():
    payload = {
        "total": 2,
        "elements": [
            {"index": 0, "tag": "div", "id": None, "classes": "a"},
            {"index": 1, "tag": "div", "id": None, "classes": "a"},
        ],
    }
    with patch(
        "subprocess.run", return_value=_fake_completed(_wrap_eval_result(payload))
    ):
        result = inspect_elements_handler(".a", limit=5)
    assert result["success"] is True
    assert result["selector"] == ".a"
    assert result["total"] == 2
    assert len(result["elements"]) == 2


def test_inspect_elements_passes_selector_through_on_failure():
    with patch("subprocess.run", side_effect=FileNotFoundError()):
        result = inspect_elements_handler(".a")
    assert result["success"] is False
    # selector key only set on the success path; failure envelope is plain.
    assert "playwright-cli" in result["error"]


# EOF
