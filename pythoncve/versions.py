from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import TypeAlias

from pythoncve.git import get_reachable_commits
from pythoncve.models import Branch, Tag


Version: TypeAlias = tuple[int, int, int]


EOL_DATES: dict[tuple[int, int], datetime] = {
    (2, 0): datetime.fromisoformat("2001-06-22T00:00:00Z"),
    (2, 1): datetime.fromisoformat("2002-04-09T00:00:00Z"),
    (2, 2): datetime.fromisoformat("2003-05-30T00:00:00Z"),
    (2, 3): datetime.fromisoformat("2008-03-11T00:00:00Z"),
    (2, 4): datetime.fromisoformat("2008-12-19T00:00:00Z"),
    (2, 5): datetime.fromisoformat("2011-05-26T00:00:00Z"),
    (2, 6): datetime.fromisoformat("2013-10-29T00:00:00Z"),
    (2, 7): datetime.fromisoformat("2020-01-01T00:00:00Z"),
    (3, 0): datetime.fromisoformat("2009-06-27T00:00:00Z"),
    (3, 1): datetime.fromisoformat("2012-04-09T00:00:00Z"),
    (3, 2): datetime.fromisoformat("2016-02-20T00:00:00Z"),
    (3, 3): datetime.fromisoformat("2017-09-29T00:00:00Z"),
    (3, 4): datetime.fromisoformat("2019-03-18T00:00:00Z"),
    (3, 5): datetime.fromisoformat("2020-09-30T00:00:00Z"),
    (3, 6): datetime.fromisoformat("2021-12-23T00:00:00Z"),
    (3, 7): datetime.fromisoformat("2023-06-27T00:00:00Z"),
    (3, 8): datetime.fromisoformat("2024-10-07T00:00:00Z"),
    (3, 9): datetime.fromisoformat("2025-10-31T00:00:00Z"),
}


def is_version_eol(version: Version, as_of: datetime | None = None) -> bool:
    """Check if a given CPython version is EOL as of a given date."""
    if as_of is None:
        as_of = datetime.now(UTC)
    minor = version[:2]
    eol_date = EOL_DATES.get(minor)
    if eol_date is None:
        return False
    return as_of >= eol_date


def get_cpython_2x_or_3x_versions(tags: set[Tag]) -> set[Tag]:
    """Get all CPython 2.x and 3.x versions."""
    return {tag for tag in tags if 2 <= tag.version[0] <= 3}


def get_latest_active_patch_versions(tags: set[Tag]) -> dict[tuple[int, int], Tag]:
    """Get the latest patch version for each non-EOL minor version."""
    latest_versions: dict[tuple[int, int], Tag] = {}
    for tag in tags:
        if is_version_eol(tag.version):
            continue
        minor = tag.version[:2]
        if minor not in latest_versions or tag.version[2] > latest_versions[minor].version[2]:
            latest_versions[minor] = tag
    return latest_versions


def compress_patch_versions_into_ranges(
    versions: set[Version],
) -> list[tuple[Version, ...]]:
    if not versions:
        return []
    sorted_versions = sorted(versions)
    ranges = []
    start = sorted_versions[0]
    end = sorted_versions[0]
    for i in range(1, len(sorted_versions)):
        current = sorted_versions[i]
        if current[2] == end[2] + 1:
            end = current
        else:
            if start == end:
                ranges.append((start,))
            else:
                ranges.append((start, end))
            start = current
            end = current
    if start == end:
        ranges.append((start,))
    else:
        ranges.append((start, end))
    return ranges


def compute_ancestry_optimized(
    repo_path: Path,
    tags: set[Tag],
    commits: set[str],
) -> dict[str, set[Version]]:
    """
    Compute ancestry between tags and commits.

    Returns:
        dict[commit] = set of tags where commit is ancestor
    """

    tags_by_minor = defaultdict(list)
    for tag in tags:
        minor = tag.version[:2]
        tags_by_minor[minor].append(tag)

    for minor in tags_by_minor:
        tags_by_minor[minor].sort()

    minor_version_rev_lists = {}
    patch_version_indices = {}
    common_rev_lists = {}
    for minor in tags_by_minor:
        sha = tags_by_minor[minor][-1].commit_sha
        minor_version_rev_lists[minor] = get_reachable_commits(repo_path, sha)
        minor_tags = tags_by_minor[minor]
        for tag in minor_tags:
            patch_version_indices[tag.version] = minor_version_rev_lists[minor].index(
                tag.commit_sha
            )
        common_rev_lists[minor] = max(
            idx for v, idx in patch_version_indices.items() if v[:2] == minor
        )

    descendants = defaultdict(set)

    common_ancestors_by_minor = {}
    for minor in tags_by_minor:
        rev_list = minor_version_rev_lists[minor]
        common_idx = common_rev_lists[minor]
        common_ancestors = set(rev_list[common_idx:]) & commits
        common_ancestors_by_minor[minor] = common_ancestors

    for tag in tags:
        # Find which commits are ancestors of this tag
        rev_list = minor_version_rev_lists[tag.version[:2]]
        idx = patch_version_indices[tag.version]
        common_idx = common_rev_lists[tag.version[:2]]
        tag_reachable_commits = rev_list[idx:common_idx]
        ancestors_of_tag = commits & set(tag_reachable_commits)
        ancestors_of_tag.update(common_ancestors_by_minor[tag.version[:2]])

        for commit in ancestors_of_tag:
            descendants[commit].add(tag.version)

    return descendants


def compute_ancestry_branch(
    repo_path: Path,
    branches: set[Branch],
    commits: set[str],
) -> dict[str, set[Branch]]:
    """
    Compute ancestry between branches and commits.

    Returns:
        dict[commit] = set of branches where commit is ancestor
    """

    descendants = defaultdict(set)
    for branch in branches:
        reachable = get_reachable_commits(repo_path, branch.commit_sha)

        # Find which commits are ancestors of this branch
        ancestors_of_branch = commits & set(reachable)

        for commit in ancestors_of_branch:
            descendants[commit].add(branch)

    return descendants
