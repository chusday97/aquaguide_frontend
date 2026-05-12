#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
ARCHIVE_DIR = ROOT / "src/data/archive"
ARCHIVE_JSON = ARCHIVE_DIR / "demoFishData.archived.json"
ARCHIVE_CSV = ARCHIVE_DIR / "demoFishData.archived.csv"


def load_fish_data():
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Could not parse fishData.ts")
    return json.loads(match.group(1))


def is_demo_item(item):
    fish_id = str(item.get("id", ""))
    # The old manually-created demo set uses numeric ids. The production import
    # uses stable sp_ ids generated from the species master list.
    return fish_id.isdigit()


def write_fish_data(items):
    text = "import { Fish } from '../types';\n\n"
    text += "export const fishData: Fish[] = "
    text += json.dumps(items, ensure_ascii=False, indent=2)
    text += ";\n"
    FISH_DATA_TS.write_text(text, encoding="utf-8")


def main():
    data = load_fish_data()
    demo_items = [item for item in data if is_demo_item(item)]
    production_items = [item for item in data if not is_demo_item(item)]

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_JSON.write_text(json.dumps(demo_items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fieldnames = [
        "id",
        "name",
        "scientificName",
        "category",
        "image",
        "difficulty",
        "waterTemperature",
        "phLevel",
        "tankSize",
        "housingMode",
    ]
    with ARCHIVE_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in demo_items:
            writer.writerow({key: item.get(key, "") for key in fieldnames})

    write_fish_data(production_items)

    print(f"archived_demo_items={len(demo_items)}")
    print(f"production_items={len(production_items)}")
    print(f"archive_json={ARCHIVE_JSON}")
    print(f"archive_csv={ARCHIVE_CSV}")


if __name__ == "__main__":
    main()
