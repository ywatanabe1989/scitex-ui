#!/usr/bin/env python3
"""MCP server for scitex-ui — skills and documentation via Model Context Protocol."""

from __future__ import annotations

import json as _json_mod
from typing import Optional

from fastmcp import FastMCP

mcp = FastMCP("scitex-ui")


def _json(obj):
    """Serialize to JSON string."""
    return _json_mod.dumps(obj, indent=2, default=str)


# =============================================================================
# Skills Tools
# =============================================================================


@mcp.tool()
def skills_list() -> str:
    """List available skill pages for scitex-ui.

    Examples
    --------
    CLI equivalent: scitex-ui skills list
    """
    try:
        from scitex_dev.skills import list_skills

        result = list_skills(package="scitex-ui")
        return _json({"success": True, "skills": result.get("scitex-ui", [])})
    except ImportError:
        return _json({"success": False, "error": "scitex-dev not installed"})


@mcp.tool()
def skills_get(name: Optional[str] = None) -> str:
    """Get a skill page for scitex-ui. Without name, returns main SKILL.md.

    Parameters
    ----------
    name : str, optional
        Reference name (e.g., 'frontend-components'). If None, returns SKILL.md.

    Examples
    --------
    CLI equivalent: scitex-ui skills get frontend-components
    """
    try:
        from scitex_dev.skills import get_skill

        content = get_skill(package="scitex-ui", name=name)
        if content:
            return _json({"success": True, "name": name, "content": content})
        target = f"'{name}'" if name else "SKILL.md"
        return _json({"success": False, "error": f"Skill {target} not found"})
    except ImportError:
        return _json({"success": False, "error": "scitex-dev not installed"})


# =============================================================================
# Element Inspector Tools — handlers in inspect.py, consumed by scitex MCP
# =============================================================================


# =============================================================================
# Server Entry Point
# =============================================================================


def run_server(transport: str = "stdio") -> None:
    """Run the MCP server."""
    mcp.run(transport=transport)


if __name__ == "__main__":
    run_server()


# EOF
