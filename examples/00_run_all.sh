#!/usr/bin/env bash
# Run all scitex-ui examples
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== scitex-ui examples ==="
echo

for script in "$SCRIPT_DIR"/[0-9][0-9]_*.py; do
    [ -f "$script" ] || continue
    name="$(basename "$script")"
    echo "--- $name ---"
    python "$script"
    echo
done

echo "=== All examples complete ==="
