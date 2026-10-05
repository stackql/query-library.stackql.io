#!/usr/bin/env python3
"""Pre-commit gate: regenerate the committed artifacts and fail if the result
does not match what is staged.

Runs build-artifacts.py (which validates entries first), then checks git
status for the generated outputs: static/docs/query-library/ and the
per-family .mdx stubs under query-library/. Only the working-tree column of
the porcelain status counts: a regenerated file that differs from the index
(" M"), or an untracked one ("??"), means the staged sources and the staged
artifacts are out of sync - the same condition the CI freshness gate fails
on. Staged-only changes ("M ", "A ", "R ") are the artifact updates this
commit legitimately carries and must pass. The rebuild is idempotent
(build_id is a content hash; manifest timestamps only change when it does),
so a clean tree passes with no side effects.

pre-commit stashes unstaged changes before running hooks, so a working-tree
diff here always means "regenerated artifacts were not staged", never "you
have unrelated local edits".
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

    # Porcelain v1 lines are "XY path": X is index-vs-HEAD, Y is
    # worktree-vs-index. Stale means Y is set (modified/deleted in the
    # worktree, or "??" untracked); a blank Y is a staged change and is fine.
    stale = [
        line
        for line in status.stdout.splitlines()
        if len(line) > 3
        and line[1] != " "
        and line[3:].strip('"') not in HANDWRITTEN
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
