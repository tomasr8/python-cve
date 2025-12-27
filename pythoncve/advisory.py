import datetime
import json
import re
from collections import defaultdict

from pythoncve.cve import fetch_cve_data, get_affected_versions, get_severity
from pythoncve.models import (
    Advisory,
    Branch,
    SecurityStatus,
    Tag,
    Version,
    VersionOverview,
    VersionRange,
)
from pythoncve.util import ADVISORY_REPO, CPYTHON_REPO, FIRST_COMMIT
from pythoncve.versions import (
    compute_ancestry_branch,
    compute_ancestry_optimized,
    get_latest_active_patch_versions,
    is_version_eol,
)


def get_raw_advisories() -> list[dict]:
    raw = []
    for path in ADVISORY_REPO.glob("advisories/python/*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        raw.append(data)
    return raw


def get_issue(data: dict) -> dict | None:
    references = data.get("references")
    if not references:
        return None

    GH_URL = re.compile(r"https://github\.com/python/cpython/issues/(\d+)")
    BPO_URL = re.compile(r"https://bugs\.python\.org/issue(\d+)")

    reports = [
        ref for ref in references if ref["type"].lower() == "report" or ref["type"].lower() == "web"
    ]
    for report in reports:
        if match := GH_URL.match(report["url"]):
            issue_number = match.group(1)
            return {"type": "github", "url": report["url"], "issue_number": issue_number}
    for report in reports:
        if match := BPO_URL.match(report["url"]):
            issue_number = match.group(1)
            return {"type": "bpo", "url": report["url"], "issue_number": issue_number}

    return None


def parse_advisory(data: dict) -> Advisory:
    aliases = data.get("aliases")
    if not aliases:
        cve = None
    else:
        cve = data["aliases"][0]
        assert cve.startswith("CVE-")

    affected = data["affected"]
    assert len(affected) == 1
    ranges = affected[0]["ranges"]
    assert len(ranges) == 1
    rng = ranges[0]
    assert rng["type"] == "GIT"

    introduced_commits = set()
    fixed_commits = set()
    for event in rng["events"]:
        if "introduced" in event:
            intro = event["introduced"]
            if intro == "0":
                intro = FIRST_COMMIT
            introduced_commits.add(intro)
        if "fixed" in event:
            fixed_commits.add(event["fixed"])

    issue = get_issue(data)

    assert data["id"]
    assert data["published"]
    assert data["modified"]
    assert data["details"]

    return Advisory(
        id=data["id"],
        cve=cve,
        published=datetime.datetime.fromisoformat(data["published"]),
        modified=datetime.datetime.fromisoformat(data["modified"]),
        severity=None,
        issue=issue,
        details=data["details"],
        introduced_commits=introduced_commits,
        fixed_commits=fixed_commits,
        affected_versions=set(),
        fixed_in=[],
        fixed_but_not_released=[],
        fixes_pending=[],
    )


def parse_advisories(tags: set[Tag], branches: set[Branch]) -> list[Advisory]:
    advisories = []
    mentioned_commits = set()

    for tag in tags:
        mentioned_commits.add(tag.commit_sha)

    for data in get_raw_advisories():
        advisory = parse_advisory(data)
        mentioned_commits.update(advisory.introduced_commits)
        mentioned_commits.update(advisory.fixed_commits)
        advisories.append(advisory)

    results = compute_ancestry_optimized(CPYTHON_REPO, tags, mentioned_commits)
    branch_ancestors = compute_ancestry_branch(CPYTHON_REPO, branches, mentioned_commits)

    tag_dates = {tag.version: tag.created_dt for tag in tags}

    for advisory in advisories:
        print(f"Processing advisory {advisory.id}...")
        cve_data = fetch_cve_data(advisory.cve) if advisory.cve else None
        severity = get_severity(cve_data) if cve_data else None
        advisory.severity = severity
        affected_versions_from_api = get_affected_versions(cve_data, tags) if cve_data else set()

        # advisory.severity = None
        # affected_versions_from_api = set()

        introduced_descendant_tags = set()
        for commit in advisory.introduced_commits:
            _tags = results[commit]
            # Filter out tags created after the advisory publication date
            _tags = {
                tag
                for tag in _tags
                if datetime.datetime.fromisoformat(tag_dates[tag]) < advisory.published
            }
            introduced_descendant_tags |= _tags
        for commit in advisory.fixed_commits:
            fixed_descendant_tags = results[commit]
            # Filter out descendants of fixed commits
            introduced_descendant_tags -= fixed_descendant_tags
            # Only the earliest fixed version is relevant
            if fixed_descendant_tags:
                earliest_fixed = sorted(fixed_descendant_tags)[0]
                advisory.fixed_in.append({"version": earliest_fixed, "commit": commit})
            else:
                br = branch_ancestors[commit]
                assert br, "Every fixed commit must have either a descendant tag or a branch"
                assert len(br) == 1
                br_fixed = sorted(br)[0]
                if br_fixed.version != "main":
                    advisory.fixed_but_not_released.append(
                        {"branch": br_fixed.version, "commit": commit}
                    )

        # Group fixed_in by version (each version can have multiple fixed commits)
        fixed_in_grouped: dict[Version, list[str]] = {}
        for entry in advisory.fixed_in:
            version = entry["version"]
            if version not in fixed_in_grouped:
                fixed_in_grouped[version] = []
            fixed_in_grouped[version].append(entry["commit"])
        advisory.fixed_in = [
            {"version": version, "commits": sorted(fixed_in_grouped[version])}
            for version in fixed_in_grouped
        ]

        if affected_versions_from_api:
            advisory.affected_versions = affected_versions_from_api
        else:
            advisory.affected_versions.update(introduced_descendant_tags)

        affected_minors = {v[:2] for v in advisory.affected_versions}

        # Find minor versions with pending fixes
        fixed_minors = {v["version"][:2] for v in advisory.fixed_in}
        fixed_but_not_released_minors = {v["branch"][:2] for v in advisory.fixed_but_not_released}
        pending_minors = (affected_minors - fixed_minors) - fixed_but_not_released_minors
        pending_minors = {
            m for m in pending_minors if not is_version_eol((m[0], m[1], 0), advisory.published)
        }

        advisory.fixes_pending = sorted(pending_minors)

        # Filter out EOL versions
        affected_eol_versions = {
            v
            for v in advisory.affected_versions
            if is_version_eol((v[0], v[1], 0), advisory.published)
        }

        advisory.affected_versions -= affected_eol_versions

        advisory.fixed_in.sort(key=lambda x: x["version"])
        advisory.fixed_but_not_released.sort(key=lambda x: x["branch"])
        advisory.fixes_pending.sort()

    def sort_key(a: Advisory):
        parts = a.id.split("-")
        year = int(parts[1])
        num = int(parts[2])
        return (year, num)

    advisories.sort(key=sort_key)
    return advisories


SEVERITY_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


def get_version_overview(advisories: list[Advisory], tags: set[Tag]):
    latest = get_latest_active_patch_versions(tags)
    affected = {
        v: VersionOverview(version=v, latest_patch={"version": t.version})
        for v, t in latest.items()
    }
    severities: dict[tuple[int, int], dict[int, str]] = defaultdict(dict)

    for advisory in advisories:
        affected_minors = {version[:2] for version in advisory.affected_versions}
        for minor in affected_minors:
            if minor in affected:
                affected[minor].is_affected = True
                affected[minor].total_advisories += 1
                affected[minor].last_published = max(
                    affected[minor].last_published, advisory.published
                )

        for version in advisory.affected_versions:
            minor = version[:2]
            if minor in affected and advisory.severity:
                patch_severity = severities[minor].get(version[2])
                if not patch_severity or (
                    SEVERITY_ORDER[advisory.severity.name] > SEVERITY_ORDER[patch_severity]
                ):
                    severities[minor][version[2]] = advisory.severity.name

    for minor, data in affected.items():
        statuses = []
        for patch in range(latest[minor].version[2] + 1):
            if patch in severities[minor]:
                statuses.append(severities[minor][patch])
            else:
                statuses.append("SAFE")

        status = statuses[0]
        start = minor + (0,)
        end = minor + (0,)
        _statuses = []
        for patch, curr_status in enumerate(statuses[1:], start=1):
            if curr_status == status:
                end = minor + (patch,)
            if curr_status != status:
                _statuses.append(
                    SecurityStatus(
                        range=VersionRange(start=start, end=end if start != end else None),
                        status=status,
                    )
                )
                start = minor + (patch,)
                end = minor + (patch,)
                status = curr_status
        _statuses.append(
            SecurityStatus(
                range=VersionRange(start=start, end=end if start != end else None),
                status=status,
            )
        )

        ranges_by_status = {
            "SAFE": [],
            "LOW": [],
            "MEDIUM": [],
            "HIGH": [],
            "CRITICAL": [],
        }

        for status in ranges_by_status:
            for s in _statuses:
                if s.status == status:
                    ranges_by_status[status].append(s.range)

        data.latest_patch["status"] = _statuses[-1].status
        data.ranges_by_status = ranges_by_status

    return sorted(affected.values(), key=lambda x: x.version, reverse=True)
