#!/usr/bin/env python3
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_IMAGES = Path("/Users/chuchu/Documents/codex/fish_pipeline/output/generated_archive/cropped_species/all_images")
IMAGE_MANIFEST = SOURCE_IMAGES / "all_images_manifest.csv"
MASTER_CSV = Path("/Users/chuchu/Desktop/Antigravity-Manager-main/20-DATA/21-Aqua-DB/aquapedia_master_v2.csv")
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
PUBLIC_DIR = ROOT / "public/species-transparent"
ASSET_MANIFEST = PUBLIC_DIR / "species_transparent_manifest.csv"
ASSET_VERSION = "cutfix4_20260510"

MANUAL_SPECIES_ROWS = [
    {
        "Common_Name": "黑壳虾",
        "Scientific_Name": "Neocaridina davidi wild type",
        "Family": "Atyidae",
        "Temp_Range": "15-28",
        "pH_Range": "6.5-8.0",
        "Max_Size_cm": "3",
        "Difficulty": "新手",
        "Layer": "Bottom",
        "Aggression": "0",
        "Diet": "Omnivore",
        "Origin": "野生型/工具生物",
        "Image_URL": f"/species-transparent/morph_batch_017_sheet_06_黑金刚米虾_Neocaridina_davidi_var._Black.png?v={ASSET_VERSION}",
        "Care_Guide": "常见草缸工具虾，能啃食藻膜并清理少量残饵；体色多为半透明黑褐色，适合成群饲养，避免与会捕食虾的中大型鱼混养。",
        "Dietary_Needs": "杂食性：藻膜+残饵+虾粮+煮熟蔬菜。频率：每周2-3次少量补喂。",
        "Feeding_Speed": "快",
        "Feeding_Layer": "底层",
        "Basic_Prompt": "",
        "Enhanced_Prompt": "Ultra-realistic professional studio macro photography of 黑壳虾 (Neocaridina davidi wild type), a wild-type freshwater dwarf shrimp. translucent dark brown to black speckled body, natural wild coloration, delicate legs and long antennae, full body side profile view, anatomically correct, isolated on a seamless pure white background, no text, no watermark, sharp focus, 8k.",
    }
]

MANUAL_IMAGE_OVERRIDES = {
    ("刚果美人", "Phenacogrammus interruptus"): "/species-transparent/刚果美人_Phenacogrammus_interruptus_transparent_v4.png?v=transparentfix_20260510",
    ("甜心柠檬灯", "Hyphessobrycon pulchripinnis var."): f"/species-transparent/morph_batch_014_sheet_10_甜心柠檬灯_Hyphessobrycon_pulchripinnis_var.png?v={ASSET_VERSION}",
    ("迷你鹦鹉鱼", "Amatitlania nigrofasciata var."): f"/species-transparent/morph_batch_011_sheet_02_迷你鹦鹉鱼_Amatitlania_nigrofasciata_var.png?v={ASSET_VERSION}",
}


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def safe_slug(value: str) -> str:
    value = re.sub(r"[^\w\u4e00-\u9fff.-]+", "_", value.strip(), flags=re.UNICODE)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "species"


def flood_fill_mask(seed_mask: np.ndarray, allowed_mask: np.ndarray) -> np.ndarray:
    h, w = allowed_mask.shape
    visited = np.zeros((h, w), dtype=bool)
    stack = [(int(y), int(x)) for y, x in zip(*np.where(seed_mask & allowed_mask))]

    while stack:
        y, x = stack.pop()
        if visited[y, x] or not allowed_mask[y, x]:
            continue
        visited[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y < h - 1:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x < w - 1:
            stack.append((y, x + 1))
    return visited


def remove_small_corner_artifacts(alpha: np.ndarray) -> np.ndarray:
    """Remove disconnected numbers/dust near crop corners without eating fish fins."""
    h, w = alpha.shape
    foreground = alpha > 20
    visited = np.zeros((h, w), dtype=bool)
    cleaned = alpha.copy()
    corner_margin_x = w * 0.18
    corner_margin_y = h * 0.18

    for start_y, start_x in zip(*np.where(foreground & ~visited)):
        stack = [(int(start_y), int(start_x))]
        pixels = []
        visited[start_y, start_x] = True

        while stack:
            y, x = stack.pop()
            pixels.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and foreground[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    stack.append((ny, nx))

        area = len(pixels)
        ys = [p[0] for p in pixels]
        xs = [p[1] for p in pixels]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        comp_w = max_x - min_x + 1
        comp_h = max_y - min_y + 1

        near_corner = (
            (center_x < corner_margin_x or center_x > w - corner_margin_x)
            and (center_y < corner_margin_y or center_y > h - corner_margin_y)
        )
        likely_caption = (
            area < 5200
            and comp_h < max(42, h * 0.16)
            and (center_y < h * 0.24 or center_y > h * 0.9)
        )
        long_edge_line = (
            (comp_w > w * 0.65 and comp_h <= 8)
            or (comp_h > h * 0.65 and comp_w <= 8)
        )

        if long_edge_line or likely_caption or (near_corner and area < 1800):
            for y, x in pixels:
                cleaned[y, x] = 0

    return cleaned


def remove_white_background(src: Path, dest: Path) -> None:
    img = Image.open(src).convert("RGBA")
    arr = np.asarray(img).copy()
    rgb = arr[:, :, :3].astype(np.int16)
    h, w = arr.shape[:2]

    brightness = rgb.max(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    dark_or_gray_line = (brightness < 95) | ((brightness < 170) & (chroma < 28))

    # Do not flood-fill dark pixels from the edge: black fins, black angelfish
    # morphs, and pleco bodies can touch title/border pixels and get eaten.
    # Thin grid lines/title fragments are removed later as small components.
    line_artifacts = np.zeros((h, w), dtype=bool)

    # Only remove edge-connected near-white pixels, so white fish body parts remain.
    near_white = (
        (rgb[:, :, 0] > 232)
        & (rgb[:, :, 1] > 232)
        & (rgb[:, :, 2] > 232)
        & ((rgb.max(axis=2) - rgb.min(axis=2)) < 34)
    )

    background = np.zeros((h, w), dtype=bool)
    stack = []

    for x in range(w):
        if near_white[0, x]:
            stack.append((0, x))
        if near_white[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if near_white[y, 0]:
            stack.append((y, 0))
        if near_white[y, w - 1]:
            stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if background[y, x] or not near_white[y, x]:
            continue
        background[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y < h - 1:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x < w - 1:
            stack.append((y, x + 1))

    background |= line_artifacts

    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[background] = 0

    # Feather the mask a little to avoid white halos around fins.
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(radius=0.7))
    alpha = np.array(alpha_img)
    alpha[background] = 0
    alpha = remove_small_corner_artifacts(alpha)
    arr[:, :, 3] = alpha

    # WebGL still samples RGB values from fully transparent pixels when textures
    # are scaled down. If hidden pixels keep sheet text/grid colors, fish can
    # look like they have black cuts in the 3D tank. Fill transparent RGB with
    # the nearby species color so alpha edges stay clean.
    visible_pixels = arr[alpha > 160, :3]
    if len(visible_pixels) > 0:
        fill_rgb = np.median(visible_pixels, axis=0).astype(np.uint8)
    else:
        fill_rgb = np.array([255, 255, 255], dtype=np.uint8)
    arr[alpha < 70, :3] = fill_rgb

    cut = Image.fromarray(arr, "RGBA")
    bbox = cut.getbbox()
    if bbox:
      subject_w = bbox[2] - bbox[0]
      subject_h = bbox[3] - bbox[1]
      pad = max(64, int(max(subject_w, subject_h) * 0.16))
      left = max(0, bbox[0] - pad)
      top = max(0, bbox[1] - pad)
      right = min(w, bbox[2] + pad)
      bottom = min(h, bbox[3] + pad)
      cut = cut.crop((left, top, right, bottom))

      # Guarantee enough transparent breathing room even when the source crop is
      # already tight. This prevents fins/tails from feeling clipped in cards,
      # round thumbnails, and the aquarium canvas.
      cut_alpha = cut.getchannel("A")
      cut_bbox = cut_alpha.getbbox()
      if cut_bbox:
          margins = (
              cut_bbox[0],
              cut_bbox[1],
              cut.width - cut_bbox[2],
              cut.height - cut_bbox[3],
          )
          extra_left = max(0, pad - margins[0])
          extra_top = max(0, pad - margins[1])
          extra_right = max(0, pad - margins[2])
          extra_bottom = max(0, pad - margins[3])
          if extra_left or extra_top or extra_right or extra_bottom:
              canvas = Image.new(
                  "RGBA",
                  (cut.width + extra_left + extra_right, cut.height + extra_top + extra_bottom),
                  (int(fill_rgb[0]), int(fill_rgb[1]), int(fill_rgb[2]), 0),
              )
              canvas.alpha_composite(cut, (extra_left, extra_top))
              cut = canvas

    dest.parent.mkdir(parents=True, exist_ok=True)
    cut.save(dest, optimize=True)


def read_manifest():
    rows = []
    with IMAGE_MANIFEST.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows


def choose_preferred(rows):
    def score(row):
        group = row.get("group", "")
        name = row.get("common_name", "")
        # Prefer base/species images over morph duplicates when both names match.
        group_score = 0
        if group == "species_batches":
            group_score = 30
        elif group == "base_missing":
            group_score = 20
        elif group == "morph_batches":
            group_score = 10
        return (group_score, -len(name))

    return sorted(rows, key=score, reverse=True)[0] if rows else None


def build_asset_index(manifest_rows):
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    for stale_png in PUBLIC_DIR.glob("*.png"):
        stale_png.unlink()

    by_common = defaultdict(list)
    by_scientific = defaultdict(list)
    out_rows = []

    for row in manifest_rows:
        src = Path(row["file"])
        common = row.get("common_name", "").strip()
        scientific = (row.get("scientific_name") or row.get("canonical_name") or "").strip()
        stem = safe_slug(src.stem)
        dest = PUBLIC_DIR / f"{stem}.png"

        if src.exists():
            remove_white_background(src, dest)

        public_path = f"/species-transparent/{dest.name}?v={ASSET_VERSION}"
        enriched = {
            **row,
            "transparent_file": str(dest),
            "public_path": public_path,
        }
        out_rows.append(enriched)
        if common:
            by_common[normalize_name(common)].append(enriched)
        if scientific:
            by_scientific[normalize_name(scientific)].append(enriched)

    ASSET_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with ASSET_MANIFEST.open("w", newline="", encoding="utf-8") as f:
        fieldnames = ["common_name", "canonical_name", "scientific_name", "group", "file", "transparent_file", "public_path"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in out_rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    return by_common, by_scientific


def load_existing_fish_data():
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Could not parse existing fishData.ts")
    return json.loads(match.group(1))


def difficulty(value):
    text = value or ""
    if "专家" in text or "困难" in text or "Hard" in text:
        return "Hard"
    if "进阶" in text or "中" in text or "Medium" in text:
        return "Medium"
    return "Easy"


def temperament(value):
    try:
        aggression = int(float(value or 0))
    except ValueError:
        aggression = 0
    if aggression >= 2:
        return "Aggressive"
    if aggression == 1:
        return "Territorial"
    return "Peaceful"


def size_label(value):
    try:
        size = float(value or 0)
    except ValueError:
        size = 0
    if size >= 25:
        return "Large"
    if size >= 8:
        return "Medium"
    return "Small"


def category(row):
    name = row.get("Common_Name", "")
    family = row.get("Family", "")
    sci = row.get("Scientific_Name", "")
    ph = row.get("pH_Range", "")
    blob = f"{name} {family} {sci}"
    if any(x in blob for x in ["珊瑚", "海葵", "Actinodiscus", "Acropora", "Euphyllia", "Clavularia"]):
        return "珊瑚/海水无脊椎"
    if "海水" in name or ph.startswith("8."):
        return "海水鱼"
    if any(x in blob for x in ["虾", "螺", "蟹", "Atyidae", "Neritidae", "Ampullariidae"]):
        return "虾螺蟹"
    if any(x in blob for x in ["草", "榕", "藻", "萍", "蕨", "椒草", "Moss", "Bucephalandra", "Cryptocoryne", "Echinodorus", "Anubias"]):
        return "水草"
    if any(x in blob for x in ["角蛙", "蝾螈", "六角恐龙", "Ambystoma", "Ceratophrys", "Cynops"]):
        return "两栖/爬宠"
    if any(x in blob for x in ["石", "沉木", "底床", "砂"]):
        return "硬景/底床"
    if any(x in blob for x in ["慈鲷", "Cichlidae", "Pterophyllum", "Betta", "斗鱼"]):
        return "慈鲷/斗鱼"
    if any(x in blob for x in ["灯", "Tetra", "Characidae", "Paracheirodon", "Hemigrammus"]):
        return "灯科鱼"
    if any(x in blob for x in ["异型", "鲶", "鼠", "Loricariidae", "Corydoras"]):
        return "鲶鱼/异型"
    return "鱼类"


def find_asset(row, by_common, by_scientific):
    common = normalize_name(row.get("Common_Name", ""))
    scientific = normalize_name(row.get("Scientific_Name", ""))

    if common in by_common:
        return choose_preferred(by_common[common])
    if scientific in by_scientific:
        return choose_preferred(by_scientific[scientific])

    # Morphs often have "var." or extra descriptors; fall back to the genus/species pair.
    base = " ".join(scientific.replace(" var.", "").split()[:2])
    if base in by_scientific:
        return choose_preferred(by_scientific[base])
    for key, rows in by_scientific.items():
        if base and (key.startswith(base) or base.startswith(key)):
            return choose_preferred(rows)
    return None


def preferred_image_for(row, by_common, by_scientific):
    override = MANUAL_IMAGE_OVERRIDES.get((row.get("Common_Name", ""), row.get("Scientific_Name", "")))
    if override:
        return override
    if row.get("Common_Name") == "黑壳虾" and row.get("Image_URL", "").startswith("/species-transparent/"):
        return row["Image_URL"]
    asset = find_asset(row, by_common, by_scientific)
    return asset["public_path"] if asset else ""


def master_to_fish(row, fish_id, image):
    temp = row.get("Temp_Range", "").replace(" ", "")
    ph = row.get("pH_Range", "").replace(" ", "")
    max_size = row.get("Max_Size_cm", "")
    tank_liters = "30"
    try:
        tank_liters = str(max(30, int(float(max_size or 5) * 8)))
    except ValueError:
        pass

    return {
        "id": fish_id,
        "name": row.get("Common_Name", ""),
        "scientificName": row.get("Scientific_Name", ""),
        "category": category(row),
        "image": image or row.get("Image_URL", ""),
        "difficulty": difficulty(row.get("Difficulty", "")),
        "waterTemperature": f"{temp}°C" if temp and "°" not in temp else temp,
        "phLevel": ph,
        "waterChangeCycle": 7 if difficulty(row.get("Difficulty", "")) == "Easy" else 5,
        "description": row.get("Care_Guide", "") or f"{row.get('Common_Name', '')} ({row.get('Scientific_Name', '')}) 的水族饲养资料。",
        "diet": row.get("Dietary_Needs", "") or row.get("Diet", "") or "建议参考物种详情中的喂养结构。",
        "tankSize": f"至少 {tank_liters} 升",
        "temperament": temperament(row.get("Aggression", "")),
        "size": size_label(max_size),
    }


def rewrite_fish_data(by_common, by_scientific):
    existing = load_existing_fish_data()
    by_key = {}
    for item in existing:
        key = (normalize_name(item.get("name", "")), normalize_name(item.get("scientificName", "")))
        by_key[key] = item

    with MASTER_CSV.open(newline="", encoding="utf-8-sig") as f:
        master_rows = list(csv.DictReader(f))
    master_rows.extend(MANUAL_SPECIES_ROWS)

    used_existing = set()
    merged = []

    for item in existing:
        matched_master = None
        item_key = (normalize_name(item.get("name", "")), normalize_name(item.get("scientificName", "")))
        for row in master_rows:
            row_key = (normalize_name(row.get("Common_Name", "")), normalize_name(row.get("Scientific_Name", "")))
            if item_key == row_key or item_key[0] == row_key[0]:
                matched_master = row
                break
        if matched_master:
            image = preferred_image_for(matched_master, by_common, by_scientific)
            if image:
                item["image"] = image
            used_existing.add((normalize_name(matched_master.get("Common_Name", "")), normalize_name(matched_master.get("Scientific_Name", ""))))
        merged.append(item)

    next_index = 1
    existing_keys = {
        (normalize_name(item.get("name", "")), normalize_name(item.get("scientificName", "")))
        for item in merged
    }
    for row in master_rows:
        key = (normalize_name(row.get("Common_Name", "")), normalize_name(row.get("Scientific_Name", "")))
        if key in existing_keys or key in used_existing:
            continue
        image = preferred_image_for(row, by_common, by_scientific)
        while any(item["id"] == f"sp_{next_index:04d}" for item in merged):
            next_index += 1
        merged.append(master_to_fish(row, f"sp_{next_index:04d}", image))
        next_index += 1

    text = "import { Fish } from '../types';\n\n"
    text += "export const fishData: Fish[] = "
    text += json.dumps(merged, ensure_ascii=False, indent=2)
    text += ";\n"
    FISH_DATA_TS.write_text(text, encoding="utf-8")
    return len(existing), len(merged)


def main():
    manifest = read_manifest()
    by_common, by_scientific = build_asset_index(manifest)
    before, after = rewrite_fish_data(by_common, by_scientific)
    print(f"transparent_images={len(list(PUBLIC_DIR.glob('*.png')))}")
    print(f"fish_data_before={before}")
    print(f"fish_data_after={after}")
    print(f"asset_manifest={ASSET_MANIFEST}")


if __name__ == "__main__":
    main()
