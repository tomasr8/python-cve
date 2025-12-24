from __future__ import annotations

import datetime
import json
from dataclasses import asdict, dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Branch:
    version: tuple[int, int] | Literal["main"]
    commit_sha: str

    def __lt__(self, other: Branch) -> bool:
        if self.is_main:
            return False
        if other.is_main:
            return True
        return self.version < other.version

    @property
    def is_main(self) -> bool:
        return self.version == "main"


@dataclass(frozen=True)
class Tag:
    """CPython version tag."""

    sha: str
    commit_sha: str
    version: tuple[int, int, int]
    created_dt: str

    def __lt__(self, other: Tag) -> bool:
        return self.version < other.version

    def __repr__(self):
        return f"Tag(version={self.version}, sha={self.sha[:7]}, commit_sha={self.commit_sha[:7]})"


@dataclass(frozen=True)
class Severity:
    name: str
    score: float
    version: str

    def __repr__(self):
        return f"Severity(name={self.name}, score={self.score})"


@dataclass
class Advisory:
    id: str
    # Not all advisories have a CVE ID
    cve: str | None
    published: str
    modified: str
    # CVSS severity; not all advisories have a severity
    severity: Severity | None
    issue: dict | None
    details: str
    introduced_commits: set
    fixed_commits: set
    affected_versions: set
    affected_eol_versions: set
    fixed_in: list
    fixed_but_not_released: list
    fixes_pending: list


class AdvisoryEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return sorted(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        if isinstance(o, Advisory | Severity | MinorVersionOverview):
            return asdict(o)
        return json.JSONEncoder.default(self, o)


@dataclass
class MinorVersionOverview:
    version: tuple[int, int]
    is_affected: bool = False
    all_versions_affected: bool = False
    severity_by_patch_version: dict[str, Severity | None] = field(default_factory=dict)
    total_advisories: int = 0
    last_published: datetime.datetime = field(
        default_factory=lambda: datetime.datetime.min.replace(tzinfo=datetime.UTC)
    )
    affected_versions: set[tuple[int, int, int]] = field(default_factory=set)
    safe_versions: set[tuple[int, int, int]] = field(default_factory=set)
