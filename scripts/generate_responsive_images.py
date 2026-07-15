#!/usr/bin/env python3
"""Generate non-destructive WebP derivatives for card and detail views."""

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SPECIES_SOURCE = PUBLIC / "species-image-overrides"
SPECIES_DISPLAY = PUBLIC / "species-display"
SPECIES_OUTPUT = PUBLIC / "responsive" / "species"
CARE_SOURCE = PUBLIC / "assets" / "qa"
CARE_OUTPUT = PUBLIC / "responsive" / "care"


def save_variant(source: Path, output: Path, max_size: int, quality: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.load()
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        image.save(output, "WEBP", quality=quality, method=2, lossless=False)


def resolved_species_sources() -> dict[str, Path]:
    sources = {path.stem: path for path in SPECIES_SOURCE.glob("sp_*.png")}
    fish_data_text = (ROOT / "src" / "data" / "fishData.ts").read_text(encoding="utf-8")
    data_start = fish_data_text.index("= [") + 2
    records = json.loads(fish_data_text[data_start:fish_data_text.rindex("]") + 1])
    for record in records:
        image_path = str(record.get("image", "")).split("?", 1)[0].lstrip("/")
        source = PUBLIC / image_path
        if source.exists():
            sources.setdefault(record["id"], source)
    for path in SPECIES_DISPLAY.glob("sp_*_display_white.png"):
        species_id = path.name.split("_", 2)[:2]
        sources["_".join(species_id)] = path
    return sources


def main() -> None:
    species_sources = resolved_species_sources()
    for species_id, source in sorted(species_sources.items()):
        save_variant(source, SPECIES_OUTPUT / f"{species_id}-256.webp", 256, 78)
        save_variant(source, SPECIES_OUTPUT / f"{species_id}-768.webp", 768, 84)

    care_sources = [path for path in CARE_SOURCE.iterdir() if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    for source in sorted(care_sources):
        save_variant(source, CARE_OUTPUT / f"{source.stem}-480.webp", 480, 80)
        save_variant(source, CARE_OUTPUT / f"{source.stem}-960.webp", 960, 84)

    print(f"species={len(species_sources)} variants={len(species_sources) * 2}")
    print(f"care={len(care_sources)} variants={len(care_sources) * 2}")


if __name__ == "__main__":
    main()
