#!/usr/bin/env python3
"""Pre-commit gate: regenerate the committed artifacts and fail if the result
does not match what is staged.

Runs build-artifacts.py (which validates entries first), then checks git
status for the generated outputs: static/docs/query-library/ and the
per-family .mdx stubs under query-library/. Any diff means the staged
sources and the staged artifacts are out of sync - the same condition the
CI freshness gate fails on. The rebuild is idempotent (build_id is a
content hash; manifest timestamps only change when it does), so a clean
tree passes with no side effects.

pre-commit stashes unstaged changes before running hooks, so a diff here
always means "regenerated artifacts were not staged", never "you have
unrelated local edits".
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATED_PATHSPECS = ["static/docs/query-library", "query-library/*.mdx"]
HANDWRITTEN = {"query-library/index.mdx"}


def main() -> int:
    build = REPO_ROOT / "query-library" / "scripts" / "build-artifacts.py"
    if subprocess.run([sys.executable, str(build)], cwd=REPO_ROOT).returncode != 0:
        return 1

    status = subprocess.run(
        ["git", "status", "--porcelain", "--", *GENERATED_PATHSPECS],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if status.returncode != 0:
        print(status.stderr, file=sys.stderr)
        return 1

    stale = [
        line
        for line in status.stdout.splitlines()
        if line.strip() and line[3:].strip('"') not in HANDWRITTEN
    ]
    if stale:
        print("Regenerated artifacts differ from what is staged:", file=sys.stderr)
        for line in stale:
            print(f"  {line}", file=sys.stderr)
        print(
            "\nThe build has refreshed these files in your working tree.\n"
            "Review them, then:  git add static/docs/query-library query-library/*.mdx\n"
            "and commit again.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
