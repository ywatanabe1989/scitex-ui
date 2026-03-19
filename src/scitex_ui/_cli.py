"""Minimal CLI for scitex-ui — docs, skills, introspection.

Follows the same pattern as scitex-stats and scitex-app CLIs.
Every SciTeX package provides: docs, skills, mcp, introspect, list-python-apis.
"""

from __future__ import annotations

import sys

try:
    import click
except ImportError:

    def main():
        print(
            "ERROR: click not installed. pip install scitex-ui[cli]",
            file=sys.stderr,
        )
        raise SystemExit(1)

else:
    CONTEXT_SETTINGS = {"help_option_names": ["-h", "--help"]}

    def _get_version() -> str:
        try:
            from importlib.metadata import version

            return version("scitex-ui")
        except Exception:
            return "0.0.0"

    @click.group(
        context_settings=CONTEXT_SETTINGS,
        invoke_without_command=True,
    )
    @click.version_option(version=_get_version(), prog_name="scitex-ui")
    @click.option(
        "--help-recursive", is_flag=True, help="Show help for all subcommands."
    )
    @click.pass_context
    def main(ctx, help_recursive):
        """SciTeX UI — shared React/TypeScript components for the workspace."""
        if help_recursive:
            click.echo(ctx.get_help())
            click.echo()
            group = ctx.command
            if isinstance(group, click.Group):
                for name in sorted(group.list_commands(ctx)):
                    cmd = group.get_command(ctx, name)
                    sub_ctx = click.Context(cmd, parent=ctx, info_name=name)
                    click.echo(f"{'=' * 60}")
                    click.echo(f"Command: {name}")
                    click.echo(f"{'=' * 60}")
                    click.echo(sub_ctx.get_help())
                    click.echo()
            ctx.exit(0)
        elif ctx.invoked_subcommand is None:
            click.echo(ctx.get_help())

    # Wire shared subcommands from scitex-dev
    try:
        from scitex_dev.cli import docs_click_group, skills_click_group

        main.add_command(docs_click_group(package="scitex-ui"))
        main.add_command(skills_click_group(package="scitex-ui"))
    except ImportError:
        pass


# EOF
