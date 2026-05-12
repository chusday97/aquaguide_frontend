#!/usr/bin/env python3
import csv
import json
import re
from collections import deque
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
PUBLIC_DIR = ROOT / "public"
OUTPUT_DIR = ROOT / "output/image_quality"
AUDIT_CSV = OUTPUT_DIR / "species_image_quality_audit.csv"
REWORK_CSV = OUTPUT_DIR / "species_image_rework_queue.csv"

KNOWN_MANUAL_ISSUES = {}

KNOWN_MANUAL_ISSUES_BY_KEY = {
    ("甜心柠檬灯", "Hyphessobrycon pulchripinnis var."): {
        "issue": "semantic_mismatch",
        "severity": "high",
        "note": "用户反馈当前甜心柠檬灯图片不符合预期；需要按甜心柠檬灯/柠檬灯改良型重新生成或替换参考图。",
    },
    ("黑壳虾", "Neocaridina davidi wild type"): {
        "issue": "temporary_placeholder",
        "severity": "high",
        "note": "黑壳虾为本地补录物种；当前暂用黑色米虾素材占位，最终应替换为半透明黑褐色野生型 Neocaridina davidi 图片。",
    },
}


def load_fish_data() -> list[dict]:
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);", text, flags=re.S)
    if not match:
        raise RuntimeError(f"Could not parse fish data from {FISH_DATA_TS}")
    return json.loads(match.group(1))


def image_path(public_url: str) -> Optional[Path]:
    if public_url.startswith("http://") or public_url.startswith("https://"):
        return None
    path = public_url.split("?", 1)[0].lstrip("/")
    return PUBLIC_DIR / path


def manual_issue_for(fish: dict) -> dict:
    return KNOWN_MANUAL_ISSUES.get(fish.get("id"), {}) or KNOWN_MANUAL_ISSUES_BY_KEY.get(
        (fish.get("name", ""), fish.get("scientificName", "")),
        {},
    )


def largest_component_ratio(mask: np.ndarray) -> float:
    h, w = mask.shape
    total = int(mask.sum())
    if total == 0:
        return 0.0

    visited = np.zeros_like(mask, dtype=bool)
    largest = 0
    ys, xs = np.where(mask)
    for start_y, start_x in zip(ys, xs):
        if visited[start_y, start_x]:
            continue
        area = 0
        queue: deque[tuple[int, int]] = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        while queue:
            y, x = queue.popleft()
            area += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
        largest = max(largest, area)
    return largest / total


def audit_image(path: Optional[Path]) -> dict:
    if path is None:
        return {
            "exists": "external",
            "foreground_ratio": "",
            "bbox_fill_ratio": "",
            "largest_component_ratio": "",
            "edge_margin_px": "",
            "edge_touch": "",
            "auto_issue": "",
            "auto_note": "外链参考图，跳过本地透明图像素检查",
        }

    if not path.exists():
        return {
            "exists": "no",
            "foreground_ratio": "0",
            "bbox_fill_ratio": "0",
            "largest_component_ratio": "0",
            "edge_margin_px": "0",
            "edge_touch": "yes",
            "auto_issue": "missing_file",
            "auto_note": "图片文件不存在",
        }

    with Image.open(path) as img:
        arr = np.array(img.convert("RGBA"))

    alpha = arr[:, :, 3]
    if alpha.min() > 250:
        rgb = arr[:, :, :3].astype(np.int16)
        brightness = rgb.max(axis=2)
        chroma = rgb.max(axis=2) - rgb.min(axis=2)
        mask = (brightness < 245) | (chroma > 24)
    else:
        mask = alpha > 32
    total_pixels = mask.size
    foreground = int(mask.sum())
    if foreground == 0:
        return {
            "exists": "yes",
            "foreground_ratio": "0",
            "bbox_fill_ratio": "0",
            "largest_component_ratio": "0",
            "edge_margin_px": "0",
            "edge_touch": "yes",
            "auto_issue": "empty_cutout",
            "auto_note": "透明图几乎没有主体",
        }

    ys, xs = np.where(mask)
    min_x, max_x = int(xs.min()), int(xs.max())
    min_y, max_y = int(ys.min()), int(ys.max())
    bbox_w = max_x - min_x + 1
    bbox_h = max_y - min_y + 1
    bbox_area = bbox_w * bbox_h
    fg_ratio = foreground / total_pixels
    bbox_fill = foreground / bbox_area
    component_ratio = largest_component_ratio(mask)
    h, w = mask.shape
    edge_margin = min(min_x, min_y, w - 1 - max_x, h - 1 - max_y)
    edge_touch = min_x <= 1 or min_y <= 1 or max_x >= w - 2 or max_y >= h - 2

    issue = ""
    notes: list[str] = []
    if fg_ratio < 0.015:
        issue = "tiny_subject"
        notes.append("主体面积过小，可能被抠掉")
    if component_ratio < 0.55:
        issue = issue or "fragmented_subject"
        notes.append("主体碎片化，可能只剩鳍/线条/局部")
    if bbox_fill < 0.05:
        issue = issue or "sparse_cutout"
        notes.append("透明图有效像素过稀，可能残留线条或主体不完整")
    if edge_touch:
        issue = issue or "edge_touch"
        notes.append("主体或残留像素贴边，建议人工抽查是否被裁切")
    elif edge_margin < 48:
        issue = issue or "low_edge_margin"
        notes.append(f"主体透明安全边距偏小（{edge_margin}px），小缩略图或3D贴图可能视觉裁切")

    return {
        "exists": "yes",
        "foreground_ratio": f"{fg_ratio:.4f}",
        "bbox_fill_ratio": f"{bbox_fill:.4f}",
        "largest_component_ratio": f"{component_ratio:.4f}",
        "edge_margin_px": str(edge_margin),
        "edge_touch": "yes" if edge_touch else "no",
        "auto_issue": issue,
        "auto_note": "；".join(notes),
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    rework_rows = []

    for fish in load_fish_data():
        path = image_path(fish.get("image", ""))
        metrics = audit_image(path)
        manual = manual_issue_for(fish)
        issue = manual.get("issue") or metrics["auto_issue"]
        severity = manual.get("severity") or ("medium" if metrics["auto_issue"] else "")
        note = manual.get("note") or metrics["auto_note"]
        row = {
            "id": fish.get("id", ""),
            "name": fish.get("name", ""),
            "scientificName": fish.get("scientificName", ""),
            "category": fish.get("category", ""),
            "image": fish.get("image", ""),
            "file": str(path) if path else fish.get("image", ""),
            **metrics,
            "issue": issue,
            "severity": severity,
            "note": note,
        }
        rows.append(row)
        if issue:
            rework_rows.append(row)

    fieldnames = [
        "id",
        "name",
        "scientificName",
        "category",
        "image",
        "file",
        "exists",
        "foreground_ratio",
        "bbox_fill_ratio",
        "largest_component_ratio",
        "edge_margin_px",
        "edge_touch",
        "auto_issue",
        "auto_note",
        "issue",
        "severity",
        "note",
    ]
    with AUDIT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with REWORK_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rework_rows)

    high = sum(1 for row in rework_rows if row["severity"] == "high")
    print(f"audited={len(rows)}")
    print(f"rework_candidates={len(rework_rows)}")
    print(f"high_priority={high}")
    print(f"audit_csv={AUDIT_CSV}")
    print(f"rework_csv={REWORK_CSV}")


if __name__ == "__main__":
    main()
