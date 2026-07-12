#!/usr/bin/env python3
import csv
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
OUTPUT = ROOT / "docs/species_knowledge_audit.csv"


def load_fish_data():
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Could not parse fishData.ts")
    return json.loads(match.group(1))


def main():
    fishes = load_fish_data()
    housing_counts = Counter((fish.get("housingReason") or "").strip() for fish in fishes)
    rows = []
    for fish in fishes:
        profile = fish.get("feedingProfile") or {}
        source_name = profile.get("sourceName") or ""
        housing_reason = (fish.get("housingReason") or "").strip()
        uses_template = "fallback" in source_name.lower() or "template" in source_name.lower()
        needs_review = bool(profile.get("needsReview"))
        rows.append({
            "species_id": fish.get("id", ""),
            "common_name": fish.get("name", ""),
            "scientific_name": fish.get("scientificName", ""),
            "category": fish.get("category", ""),
            "feeding_source": source_name,
            "feeding_confidence": profile.get("confidence", ""),
            "feeding_uses_template": "yes" if uses_template else "no",
            "feeding_needs_review": "yes" if needs_review else "no",
            "feeding_review_reason": profile.get("reviewReason", ""),
            "feeding_source_url": profile.get("sourceUrl", ""),
            "feeding_source_fields": ",".join(profile.get("sourceFields") or []),
            "housing_mode": fish.get("housingMode", ""),
            "housing_reason": housing_reason,
            "housing_reason_shared_count": housing_counts[housing_reason] if housing_reason else 0,
            "housing_only_category_reference": "yes" if housing_reason and housing_counts[housing_reason] > 1 else "no",
            "missing_species_specific_care": "yes" if needs_review or uses_template or not profile else "no",
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"audited={len(rows)}")
    print(f"needs_review={sum(row['feeding_needs_review'] == 'yes' for row in rows)}")
    print(f"template_profiles={sum(row['feeding_uses_template'] == 'yes' for row in rows)}")
    print(f"shared_housing_references={sum(row['housing_only_category_reference'] == 'yes' for row in rows)}")
    print(f"output={OUTPUT}")


if __name__ == "__main__":
    main()
