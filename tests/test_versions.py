import datetime

from pythoncve.git import get_cpython_tags
from pythoncve.models import Tag
from pythoncve.versions import (
    EOL_DATES,
    Version,
    compress_patch_versions_into_ranges,
    compute_ancestry_optimized,
    get_cpython_2x_or_3x_versions,
    get_latest_active_patch_versions,
    is_version_eol,
)


def test_is_version_eol():
    as_of = datetime.datetime(2025, 12, 24, tzinfo=datetime.UTC)
    for major, minor in EOL_DATES:
        version: Version = (major, minor, 0)
        assert is_version_eol(version, as_of)

    assert not is_version_eol((3, 10, 0), as_of)
    assert not is_version_eol((4, 0, 0), as_of)


def test_get_cpython_2x_or_3x_versions():
    tags = (
        Tag(sha="a1", commit_sha="u1", version=(3, 6, 15), created_dt=""),
        Tag(sha="b2", commit_sha="v2", version=(1, 1, 1), created_dt=""),
        Tag(sha="c3", commit_sha="x3", version=(4, 0, 0), created_dt=""),
        Tag(sha="d4", commit_sha="y4", version=(2, 7, 2), created_dt=""),
    )

    versions = get_cpython_2x_or_3x_versions(set(tags))
    assert versions == {tags[0], tags[3]}


def test_compress_patch_versions_into_ranges():
    assert compress_patch_versions_into_ranges(set()) == []
    assert compress_patch_versions_into_ranges({(3, 9, 1)}) == [((3, 9, 1),)]

    versions = {
        (3, 9, 2),
        (3, 9, 1),
        (3, 9, 7),
        (3, 9, 6),
        (3, 9, 5),
        (3, 9, 10),
        (3, 9, 12),
    }
    compressed = compress_patch_versions_into_ranges(versions)
    assert compressed == [
        ((3, 9, 1), (3, 9, 2)),
        ((3, 9, 5), (3, 9, 7)),
        ((3, 9, 10),),
        ((3, 9, 12),),
    ]


def test_get_latest_active_patch_versions():
    tags = {
        Tag(sha="a1", commit_sha="u1", version=(3, 6, 5), created_dt=""),
        Tag(sha="b2", commit_sha="v2", version=(3, 6, 15), created_dt=""),
        Tag(sha="c3", commit_sha="x3", version=(4, 0, 1), created_dt=""),
        Tag(sha="d4", commit_sha="y4", version=(4, 0, 2), created_dt=""),
    }

    latest_versions = get_latest_active_patch_versions(tags)
    assert latest_versions == {
        (4, 0): Tag(sha="d4", commit_sha="y4", version=(4, 0, 2), created_dt=""),
    }


def test_compute_ancestry(git_repo):
    tags = get_cpython_tags(git_repo)
    tags_by_version = {tag.version: tag for tag in tags}

    for tag in sorted(tags):
        descendants = compute_ancestry_optimized(git_repo, {tag}, {tag.commit_sha})
        assert descendants == {tag.commit_sha: {tag.version}}

    descendants = compute_ancestry_optimized(git_repo, tags, {tag.commit_sha for tag in tags})
    assert descendants == {
        tags_by_version[(3, 12, 0)].commit_sha: {(3, 12, 0), (3, 12, 1), (3, 12, 2), (3, 13, 0)},
        tags_by_version[(3, 12, 1)].commit_sha: {(3, 12, 1), (3, 12, 2), (3, 13, 0)},
        tags_by_version[(3, 12, 2)].commit_sha: {(3, 12, 2)},
        tags_by_version[(3, 13, 0)].commit_sha: {(3, 13, 0)},
    }
