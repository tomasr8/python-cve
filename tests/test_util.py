import pytest

from pythoncve.util import parse_cpython_version


@pytest.mark.parametrize(
    "tag_name,expected",
    [
        ("v1.0.0", (1, 0, 0)),
        ("v3.9.7", (3, 9, 7)),
        ("3.10.2", (3, 10, 2)),
        ("v2.7.18", (2, 7, 18)),
        ("v3.11.0", (3, 11, 0)),
        ("v3.12.1", (3, 12, 1)),
        ("v3.9", None),
        ("v3.9.7rc1", None),
        ("release-3.10.0", None),
        ("v4.0.0-alpha", None),
    ],
)
def test_parse_cpython_version(tag_name, expected):
    assert parse_cpython_version(tag_name) == expected
    if tag_name.startswith("v"):
        assert parse_cpython_version(tag_name[1:]) == expected

