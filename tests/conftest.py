import subprocess
from pathlib import Path

import pytest


@pytest.fixture
def git_repo(tmp_path: Path):
    """Create a dummy git repository with commits, branches, and tags.

    The repository structure:
    - main branch with 3 commits
    - feature branch (branched from commit 2) with 1 additional commit
    - Tags: v3.12.0 (commit 1), v3.12.1 (commit 2), v3.13.0 (commit 3)

    Returns:
        Path to the git repository directory.
    """
    repo_path = tmp_path / "test_repo"
    repo_path.mkdir()

    def git(*args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", *args],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True,
        )

    # Initialize repo
    git("init")
    git("config", "user.email", "pytest@example.com")
    git("config", "user.name", "pytest")

    file_path = repo_path / "test.txt"

    # Create initial commit
    file_path.write_text("# Test Repository\n")
    git("add", "-A")
    git("commit", "-m", "Initial commit")
    git("tag", "-a", "v3.12.0", "-m", "v3.12.0")

    # Second commit
    file_path.write_text("foo\n")
    git("commit", "-am", "3.12.1")
    git("tag", "-a", "v3.12.1", "-m", "v3.12.1")
    # Create feature branch from current commit
    git("checkout", "-b", "3.13")
    file_path.write_text("3.13\n")
    git("commit", "-am", "3.13")
    git("tag", "-a", "v3.13.0", "-m", "v3.13.0")

    # Switch back to main and add another commit
    git("checkout", "master")
    file_path.write_text("3.12.2\n")
    git("commit", "-am", "3.12.2")
    git("tag", "-a", "v3.12.2", "-m", "v3.12.2")

    return repo_path
