from __future__ import annotations

import datetime
import json
from dataclasses import asdict, dataclass, field, is_dataclass
from typing import Literal


type Version = tuple[int, int, int]
type Minor = tuple[int, int]
type SeverityLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


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
    name: SeverityLevel
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
    # Affected versions which are not EOL (at the time of the advisory being published)
    affected_versions: set
    fixed_in: list
    fixed_but_not_released: list
    fixes_pending: list


class AdvisoryEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return sorted(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        if is_dataclass(o):
            return asdict(o)
        return json.JSONEncoder.default(self, o)


@dataclass(frozen=True)
class VersionRange:
    start: Version
    end: Version | None = None

    @property
    def is_range(self) -> bool:
        return self.end is not None

    def __repr__(self):
        if self.end:
            return f"{self.start[0]}.{self.start[1]}.{self.start[2]} - {self.end[0]}.{self.end[1]}.{self.end[2]}"
        return f"{self.start[0]}.{self.start[1]}.{self.start[2]}"


@dataclass(frozen=True)
class SecurityStatus:
    range: VersionRange
    status: Literal["SAFE"] | SeverityLevel


@dataclass
class VersionOverview:
    version: Minor
    latest_patch: dict = field(default_factory=dict)
    is_affected: bool = False
    total_advisories: int = 0
    last_published: datetime.datetime = field(
        default_factory=lambda: datetime.datetime.min.replace(tzinfo=datetime.UTC)
    )
    ranges_by_status: dict[str, list[VersionRange]] = field(default_factory=dict)
