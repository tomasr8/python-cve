from pathlib import Path

from pythoncve.git import get_cpython_tags, get_reachable_commits


def test_get_cpython_tags(git_repo: Path):
    tags = get_cpython_tags(git_repo)
    versions = {tag.version for tag in tags}
    assert versions == {(3, 12, 0), (3, 12, 1), (3, 12, 2), (3, 13, 0)}


def test_get_reachable_commits(git_repo: Path):
    tags = get_cpython_tags(git_repo)
    tags_by_version = {tag.version: tag for tag in tags}

    reachable_commits = get_reachable_commits(git_repo, tags_by_version[(3, 12, 0)].commit_sha)
    assert reachable_commits == [tags_by_version[(3, 12, 0)].commit_sha]

    reachable_commits = get_reachable_commits(git_repo, tags_by_version[(3, 12, 1)].commit_sha)
    assert reachable_commits == [
        tags_by_version[(3, 12, 1)].commit_sha,
        tags_by_version[(3, 12, 0)].commit_sha,
    ]

    reachable_commits = get_reachable_commits(git_repo, tags_by_version[(3, 13, 0)].commit_sha)
    assert reachable_commits == [
        tags_by_version[(3, 13, 0)].commit_sha,
        tags_by_version[(3, 12, 1)].commit_sha,
        tags_by_version[(3, 12, 0)].commit_sha,
    ]

    reachable_commits = get_reachable_commits(git_repo, tags_by_version[(3, 12, 2)].commit_sha)
    assert reachable_commits == [
        tags_by_version[(3, 12, 2)].commit_sha,
        tags_by_version[(3, 12, 1)].commit_sha,
        tags_by_version[(3, 12, 0)].commit_sha,
    ]
