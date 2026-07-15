#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SPECIES = PUBLIC / "responsive" / "species"
CARE = PUBLIC / "responsive" / "care"


def assert_image(path: Path, max_size: int, max_bytes: int | None = None) -> None:
    assert path.exists(), f"missing {path.relative_to(ROOT)}"
    if max_bytes is not None:
        assert path.stat().st_size <= max_bytes, f"oversized {path.name}: {path.stat().st_size}"
    with Image.open(path) as image:
        assert image.width <= max_size and image.height <= max_size, f"wrong dimensions {path.name}: {image.size}"


def main() -> None:
    fish_data_text = (ROOT / "src" / "data" / "fishData.ts").read_text(encoding="utf-8")
    data_start = fish_data_text.index("= [") + 2
    records = json.loads(fish_data_text[data_start:fish_data_text.rindex("]") + 1])
    species_ids = {record["id"] for record in records if (PUBLIC / str(record.get("image", "")).split("?", 1)[0].lstrip("/")).exists()}
    species_ids.update(path.stem for path in (PUBLIC / "species-image-overrides").glob("sp_*.png"))
    species_ids.update("_".join(path.name.split("_", 2)[:2]) for path in (PUBLIC / "species-display").glob("sp_*_display_white.png"))
    for species_id in species_ids:
        assert_image(SPECIES / f"{species_id}-256.webp", 256, 100_000)
        assert_image(SPECIES / f"{species_id}-768.webp", 768)

    care_sources = [path for path in (PUBLIC / "assets" / "qa").iterdir() if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}]
    for source in care_sources:
        assert_image(CARE / f"{source.stem}-480.webp", 480, 100_000)
        assert_image(CARE / f"{source.stem}-960.webp", 960)

    assert len(list(SPECIES.glob("*.webp"))) == len(species_ids) * 2
    assert len(list(CARE.glob("*.webp"))) == len(care_sources) * 2
    print(f"responsive images passed: species={len(species_ids)}, care={len(care_sources)}")


if __name__ == "__main__":
    main()
