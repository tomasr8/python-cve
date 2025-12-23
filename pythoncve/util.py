import datetime
import re
from pathlib import Path


ADVISORY_REPO_URL = "https://github.com/psf/advisory-database.git"
CPYTHON_REPO_URL = "https://github.com/python/cpython.git"

REPO_ROOT = Path(__file__).parent.parent

TMP_DIR = REPO_ROOT / "tmp"
SRC_DIR = REPO_ROOT / "src"

CPYTHON_REPO = TMP_DIR / "cpython"
ADVISORY_REPO = TMP_DIR / "advisory-database"

# first commit in CPython
FIRST_COMMIT = "7f777ed95a19224294949e1b4ce56bbffcb1fe9f"


def parse_cpython_version(tag_name: str) -> tuple[int, int, int] | None:
    """
    Parse CPython version tag like v3.12.1 into (3, 12, 1).
    Returns None for non-version tags.
    """
    match = re.match(r"v?(\d+)\.(\d+)\.(\d+)$", tag_name)
    if not match:
        return None
    return tuple(map(int, match.groups()))


def now_utc() -> str:
    return datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat()
