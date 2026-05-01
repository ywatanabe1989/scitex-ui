#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: /home/ywatanabe/proj/scitex-ui/tests/integration/test_examples_smoke.py

"""End-to-end smoke: every example script must run to completion.

Skipped when the umbrella `scitex` package isn't importable (CI installs
only `scitex-ui[dev]`, which doesn't pull `scitex` — the converted
`@stx.session` examples need it). The per-example syntax/import smoke
lives in `tests/examples/test_*.py` and runs unconditionally.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

EXAMPLES = sorted(Path(__file__).resolve().parents[2].joinpath("examples").glob("*.py"))


def _scitex_session_works() -> bool:
    """Return True iff a no-op `@stx.session` runs end-to-end.

    `import scitex` alone isn't enough — the session lifecycle pulls in
    `scitex_repro.RandomStateManager`, which probes optional ML libs
    (tensorflow / jax). In environments where those libs are partially
    installed but broken (protobuf version skew, jax circular imports),
    every `@stx.session` example would fail for reasons unrelated to
    scitex-ui. Skip in that case so the smoke test doesn't mask its
    own real signal.
    """
    r = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import scitex as stx\n"
                "@stx.session\n"
                "def main(CONFIG=stx.session.INJECTED, "
                "logger=stx.session.INJECTED):\n"
                "    return 0\n"
                "main()\n"
            ),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    return r.returncode == 0


@pytest.mark.skipif(
    not _scitex_session_works(),
    reason="scitex.session machinery not functional in this environment",
)
def test_examples_smoke(tmp_path):
    """Run every examples/*.py script to completion in `tmp_path`."""
    assert EXAMPLES, "no example scripts found"
    for ex in EXAMPLES:
        r = subprocess.run(
            [sys.executable, str(ex)],
            cwd=tmp_path,
            capture_output=True,
            text=True,
            timeout=180,
        )
        assert r.returncode == 0, f"{ex.name} failed: {r.stderr[-2000:]}"


# EOF
