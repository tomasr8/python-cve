import json

import click

from pythoncve.advisory import get_version_overview, parse_advisories
from pythoncve.git import clone_advisory_repo, clone_cpython_repo, get_cpython_tags
from pythoncve.models import AdvisoryEncoder
from pythoncve.util import CPYTHON_REPO, SRC_DIR, now_utc
from pythoncve.versions import (
    compress_patch_versions_into_ranges,
    get_cpython_2x_or_3x_versions,
)


@click.group()
def cli():
    pass


@cli.command("update")
def update():
    clone_advisory_repo()
    clone_cpython_repo()

    tags = get_cpython_2x_or_3x_versions(get_cpython_tags(CPYTHON_REPO))
    print(f"Found {len(tags)} CPython version tags.")
    advisories = parse_advisories(tags)

    overview = get_version_overview(advisories, tags)

    for advisory in advisories:
        advisory.affected_versions = compress_patch_versions_into_ranges(advisory.affected_versions)
        advisory.affected_eol_versions = compress_patch_versions_into_ranges(
            advisory.affected_eol_versions
        )

    s = json.dumps([advisory for advisory in advisories], indent=2, cls=AdvisoryEncoder)
    (SRC_DIR / "advisories.json").write_text(s, encoding="utf-8")

    now = now_utc()
    versions = sorted((tuple(int(part) for part in k.split(".")) for k in overview), reverse=True)
    o = {}
    for v in versions:
        o[f"{v[0]}.{v[1]}"] = overview[f"{v[0]}.{v[1]}"]

    s = json.dumps({"last_updated": now, "overview": o}, indent=2, cls=AdvisoryEncoder)
    (SRC_DIR / "overview.json").write_text(s, encoding="utf-8")
