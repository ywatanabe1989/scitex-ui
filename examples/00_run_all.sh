#!/usr/bin/env bash
# Run all scitex-ui examples; tee output and report PASS/FAIL summary.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/00_run_all.sh.log"

GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
RESET=$'\033[0m'

declare -a PASSED=()
declare -a FAILED=()

run() {
    echo "=== scitex-ui examples ==="
    echo

    for script in "$SCRIPT_DIR"/[0-9][0-9]_*.py; do
        [ -f "$script" ] || continue
        name="$(basename "$script")"
        echo "--- $name ---"
        if python "$script"; then
            PASSED+=("$name")
        else
            FAILED+=("$name")
        fi
        echo
    done

    echo "=== Summary ==="
    for n in "${PASSED[@]}"; do
        echo "${GREEN}PASS${RESET}  $n"
    done
    for n in "${FAILED[@]}"; do
        echo "${RED}FAIL${RESET}  $n"
    done
    echo
    echo "Passed: ${#PASSED[@]}  Failed: ${#FAILED[@]}"

    [ "${#FAILED[@]}" -eq 0 ]
}

run 2>&1 | tee "$LOG_FILE"
exit "${PIPESTATUS[0]}"
