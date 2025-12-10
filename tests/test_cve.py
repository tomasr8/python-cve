from pythoncve.cve import get_affected_versions, get_severity
from pythoncve.models import Tag


def test_get_affected_versions():
    tags = {
        Tag(sha="a1", commit_sha="u1", version=(3, 6, 5), created_dt=""),
        Tag(sha="b2", commit_sha="v2", version=(3, 7, 1), created_dt=""),
        Tag(sha="c3", commit_sha="x3", version=(3, 8, 2), created_dt=""),
        Tag(sha="d4", commit_sha="y4", version=(3, 9, 0), created_dt=""),
    }

    assert get_affected_versions({}, tags) == set()
    assert get_affected_versions({"containers": {"cna": {"affected": [{}]}}}, tags) == set()
    assert (
        get_affected_versions({"containers": {"cna": {"affected": [{"versions": []}]}}}, tags)
        == set()
    )
    assert (
        get_affected_versions(
            {
                "containers": {
                    "cna": {
                        "affected": [
                            {
                                "versions": [
                                    {
                                        "versionType": "python",
                                        "status": "unaffected",
                                        "version": "3.6.0",
                                        "lessThan": "3.7.0",
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            tags,
        )
        == set()
    )
    assert (
        get_affected_versions(
            {
                "containers": {
                    "cna": {
                        "affected": [
                            {
                                "versions": [
                                    {
                                        "versionType": "pip",
                                        "status": "affected",
                                        "version": "3.6.0",
                                        "lessThan": "3.7.0",
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            tags,
        )
        == set()
    )

    cve_data = {
        "containers": {
            "cna": {
                "affected": [
                    {
                        "versions": [
                            {
                                "versionType": "python",
                                "status": "affected",
                                "version": "3.6.0",
                                "lessThan": "3.7.0",
                            },
                            {
                                "versionType": "python",
                                "status": "affected",
                                "version": "3.8.0",
                                "lessThan": "3.9.0",
                            },
                        ]
                    }
                ]
            }
        }
    }

    affected_versions = get_affected_versions(cve_data, tags)
    assert affected_versions == {(3, 6, 5), (3, 8, 2)}


def test_get_severity():
    assert get_severity({"containers": {"cna": {}}}) is None
    assert get_severity({"containers": {"cna": {"metrics": []}}}) is None
    assert get_severity({"containers": {"cna": {"metrics": [{"foo": {}}]}}}) is None

    cve_data = {
        "containers": {
            "cna": {
                "metrics": [
                    {
                        "cvssV3_1": {
                            "baseSeverity": "HIGH",
                            "baseScore": 7.5,
                            "version": "3.1",
                        }
                    }
                ]
            }
        }
    }

    severity = get_severity(cve_data)
    assert severity is not None
    assert severity.name == "HIGH"
    assert severity.score == 7.5
    assert severity.version == "3.1"

    cve_data = {
        "containers": {
            "cna": {
                "metrics": [
                    {
                        "cvssV4_0": {
                            "baseSeverity": "LOW",
                            "baseScore": 1.9,
                            "version": "4.0",
                        }
                    }
                ]
            }
        }
    }

    severity = get_severity(cve_data)
    assert severity is not None
    assert severity.name == "LOW"
    assert severity.score == 1.9
    assert severity.version == "4.0"
