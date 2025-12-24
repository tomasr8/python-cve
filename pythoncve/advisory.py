import datetime
import json
from dataclasses import asdict

from pythoncve.cve import fetch_cve_data, get_affected_versions, get_severity
from pythoncve.models import Advisory, Branch, MinorVersionOverview, Tag
from pythoncve.util import ADVISORY_REPO, CPYTHON_REPO, FIRST_COMMIT
from pythoncve.versions import (
    compress_patch_versions_into_ranges,
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

    reports = [
        ref for ref in references if ref["type"].lower() == "report" or ref["type"].lower() == "web"
    ]
    for report in reports:
        if "github.com/python/cpython/issues/" in report["url"]:
            return {"type": "github", "url": report["url"]}
    for report in reports:
        if "bugs.python.org/issue" in report["url"]:
            return {"type": "bpo", "url": report["url"]}

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
        affected_eol_versions=set(),
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

        if affected_versions_from_api:
            advisory.affected_versions = affected_versions_from_api
        else:
            advisory.affected_versions.update(introduced_descendant_tags)

        affected_minors = {v[:2] for v in advisory.affected_versions}

        # Find minor versions with pending fixes
        fixed_minors = {v["version"][:2] for v in advisory.fixed_in}
        pending_minors = affected_minors - fixed_minors
        pending_minors = {
            m for m in pending_minors if not is_version_eol((m[0], m[1], 0), advisory.published)
        }

        advisory.fixes_pending = sorted(pending_minors)

        # Filter out EOL versions
        advisory.affected_eol_versions = {
            v
            for v in advisory.affected_versions
            if is_version_eol((v[0], v[1], 0), advisory.published)
        }

        advisory.affected_versions -= advisory.affected_eol_versions

        advisory.fixed_in.sort(key=lambda x: x["version"])
        # advisory.fixed_but_not_released.sort(key=lambda x: x["version"]) TODO: sort
        advisory.fixes_pending.sort()

    def sort_key(a: Advisory):
        parts = a.id.split("-")
        year = int(parts[1])
        num = int(parts[2])
        return (year, num)

    advisories.sort(key=sort_key)
    return advisories


def get_version_overview(advisories: list[Advisory], tags: set[Tag]):
    latest = get_latest_active_patch_versions(tags)
    affected = {v: MinorVersionOverview(version=v) for v in latest}

    for advisory in advisories:
        minors = {v[:2] for v in advisory.affected_versions}
        for minor in minors:
            if minor in affected:
                affected[minor].is_affected = True
                affected[minor].total_advisories += 1
                pub_dt = advisory.published
                affected[minor].last_published = max(affected[minor].last_published, pub_dt)
        for version in advisory.affected_versions:
            if version[:2] in affected:
                affected[version[:2]].affected_versions.add(version)
        # for version in advisory.fixed_versions:
        #     if version[:2] in affected:
        #         affected[version[:2]]["safe_versions"].add(version)
    for v in latest:
        all_patch_versions = {tag.version for tag in tags if tag.version[:2] == v}
        affected[v[:2]].safe_versions = all_patch_versions - affected[v[:2]].affected_versions

    for k, value in affected.items():
        tags_in_minor = [tag for tag in tags if tag.version[:2] == k]
        versions_in_minor = {tag.version for tag in tags_in_minor}
        if value.is_affected and versions_in_minor == set(value.affected_versions):
            value.all_versions_affected = True

        value.affected_versions = compress_patch_versions_into_ranges(value.affected_versions)

        value.safe_versions = compress_patch_versions_into_ranges(value.safe_versions)

        # Get the highest severity per patch version
        severity_by_patch = {}
        for advisory in advisories:
            for version in advisory.affected_versions:
                if version[:2] == k and advisory.severity:
                    existing = severity_by_patch.get(version)
                    if not existing or advisory.severity.score > existing.score:
                        severity_by_patch[version] = advisory.severity
        affected[k].severity_by_patch_version = {
            f"{v[0]}.{v[1]}.{v[2]}": asdict(s) for v, s in severity_by_patch.items()
        }

    return {f"{k[0]}.{k[1]}": v for k, v in affected.items()}
