"""Verify frozen scientific bytes, source omissions, and local Markdown links."""

import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    fingerprints = json.loads((ROOT / "docs/release-fingerprints.json").read_text(encoding="utf8"))
    for name, expected in fingerprints.items():
        data = (ROOT / name).read_bytes()
        if Path(name).suffix in {".csv", ".json", ".py"}:
            data = data.replace(b"\r\n", b"\n")
        assert hashlib.sha256(data).hexdigest() == expected, name
    with (ROOT / "data/phase4_data_sources/release_manifest.csv").open(encoding="utf8", newline="") as handle:
        sources = list(csv.DictReader(handle))
    assert len(sources) == 26
    assert len({row["historical_path"] for row in sources}) == 26
    for row in sources:
        assert not (ROOT / row["historical_path"]).exists(), row["historical_path"]
        assert re.fullmatch(r"[a-f0-9]{64}", row["sha256"])
        assert row["title"] and row["distribution"] == "not distributed"
        if not row["paper_id"].startswith("NOTE-"):
            assert row["doi"] and row["source_url"]
    assert not list((ROOT / "data/phase4_data_sources").rglob("*.pdf"))
    for name in ["hackathon-energy-deep-research-report.md", "info/context/hackathon-energy-deep-research-report.md"]:
        assert not (ROOT / name).exists(), name
    documents = [ROOT / "README.md", *list((ROOT / "docs").rglob("*.md")),
                 *list((ROOT / "data").rglob("*.md")), ROOT / "model/README.md", ROOT / "model/MODEL_CARD.md"]
    for document in documents:
        text = document.read_text(encoding="utf8")
        for target in re.findall(r"\]\(([^)]+)\)", text):
            if re.match(r"https?:|mailto:|#", target):
                continue
            assert (document.parent / target.split("#")[0]).exists(), (document, target)
    print(f"PASS: {len(fingerprints)} frozen scientific files (LF-normalized text; raw binaries), 26 source omissions, {len(documents)} documents' local links")


if __name__ == "__main__":
    main()
