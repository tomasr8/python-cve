import re
import subprocess
from pathlib import Path

from pythoncve.models import Branch, Tag
from pythoncve.util import (
    ADVISORY_REPO,
    ADVISORY_REPO_URL,
    CPYTHON_REPO,
    CPYTHON_REPO_URL,
    parse_cpython_version,
)


def get_cpython_tags(repo_path: Path) -> set[Tag]:
    result = subprocess.run(
        [
            "git",
            "tag",
            "--list",
            # %(objectname) = tag object SHA (or commit SHA for lightweight tags)
            # %(*objectname) = dereferenced commit SHA (empty for lightweight tags)
            "--format=%(refname:short) %(objectname) %(*objectname) %(creatordate:iso8601-strict)",
        ],
        capture_output=True,
        text=True,
        check=True,
        cwd=repo_path,
    )
    tags = set()
    for line in result.stdout.strip().split("\n"):
        parts = line.split()
        # Annotated tags have 4 parts (name, tag_sha, commit_sha, date)
        # Lightweight tags have 3 parts (name, commit_sha, date) - %(*objectname) is empty
        if len(parts) == 4:
            name, tag_sha, commit_sha, created_dt = parts
        else:
            name, commit_sha, created_dt = parts
            tag_sha = commit_sha  # Lightweight tag: tag SHA == commit SHA
        version = parse_cpython_version(name)
        if version:
            tags.add(
                Tag(sha=tag_sha, commit_sha=commit_sha, version=version, created_dt=created_dt)
            )
    return tags


def get_reachable_commits(repo_path: Path, commit_sha: str) -> list[str]:
    """Get all commits reachable from a given commit."""
    result = subprocess.run(
        ["git", "rev-list", commit_sha],
        capture_output=True,
        text=True,
        check=True,
        cwd=repo_path,
    )
    return result.stdout.strip().split("\n")


def get_cpython_version_branches(repo_path: Path) -> set[Branch]:
    result = subprocess.run(
        [
            "git",
            "branch",
            "--list",
            # %(objectname) = branch SHA
            "--format=%(refname:short) %(objectname)",
        ],
        capture_output=True,
        text=True,
        check=True,
        cwd=repo_path,
    )
    branches: set[Branch] = set()
    for line in result.stdout.strip().split("\n"):
        name, commit_sha = line.split()
        if name == "main":
            branches.add(Branch(version="main", commit_sha=commit_sha))
        else:
            match = re.match(r"^(\d+)\.(\d+)$", name)
            if match:
                version = tuple(map(int, match.groups()))
                branches.add(Branch(version=version, commit_sha=commit_sha))
    return branches


def clone_advisory_repo() -> None:
    """Clone the advisory-database repository if not already present."""
    if not ADVISORY_REPO.exists():
        subprocess.run(
            [
                "git",
                "clone",
                "--depth=1",
                "--single-branch",
                "--no-tags",
                ADVISORY_REPO_URL,
                str(ADVISORY_REPO),
            ],
            check=True,
        )


def clone_cpython_repo() -> None:
    """Clone the CPython repository if not already present."""
    if not CPYTHON_REPO.exists():
        subprocess.run(
            [
                "git",
                "clone",
                "--bare",
                "--filter=blob:none",
                CPYTHON_REPO_URL,
                str(CPYTHON_REPO),
            ],
            check=True,
        )
