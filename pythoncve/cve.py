import requests

from pythoncve.models import Severity, Tag
from pythoncve.util import parse_cpython_version


API_URL = "https://cve.circl.lu/api/cve/"


def fetch_cve_data(
    cve: str,
) -> dict:
    resp = requests.get(f"{API_URL}{cve}")
    assert resp.status_code == 200, f"Failed to fetch CVE data for {cve}"
    return resp.json()


def get_affected_versions(cve_data: dict, tags: set[Tag]) -> set[tuple[int, int, int]]:
    """Get the affected CPython versions from the CVE data."""
    affected = cve_data.get("containers", {}).get("cna", {}).get("affected", [{}])[0]
    versions = affected.get("versions", [])
    python_versions = [
        v for v in versions if v.get("versionType") == "python" and v.get("status") == "affected"
    ]
    if not python_versions:
        return set()

    versions = set()
    for v in python_versions:
        assert "version" in v
        assert "lessThan" in v

        version = v["version"]
        if version == "0":
            # Convert to a valid version
            version = "0.0.0"

        version_value = parse_cpython_version(version)
        less_than = parse_cpython_version(v["lessThan"])

        if not version_value or not less_than:
            continue

        versions |= {t.version for t in tags if version_value <= t.version < less_than}

    return versions


def get_severity(cve_data: dict) -> Severity | None:
    """Get the CVSS severity from the CVE data."""
    metrics = cve_data.get("containers", {}).get("cna", {}).get("metrics", {})
    if not metrics:
        return None

    assert len(metrics) == 1
    metric = metrics[0]

    cvss = metric.get("cvssV4_0") or metric.get("cvssV3_1")
    if not cvss:
        return None

    severity_name = cvss.get("baseSeverity")
    severity_score = cvss.get("baseScore")
    version = cvss.get("version")
    assert severity_name is not None
    assert severity_score is not None
    assert version is not None
    return Severity(name=severity_name, score=severity_score, version=version)
