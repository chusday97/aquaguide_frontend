#!/usr/bin/env python3
import csv
import html
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
AUDIT_HTML = OUTPUT_DIR / "species_image_quality_audit.html"

ENCYCLOPEDIA_DISPLAY_IMAGE_OVERRIDES = {
    "sp_0019": "/species-display/sp_0019_埃及神仙_display_white.png?v=displayfix_20260510",
    "sp_0175": "/species-display/sp_0175_血钻神仙_display_white.png?v=displayfix_20260510",
    "sp_0176": "/species-display/sp_0176_黑白大理石神仙_display_white.png?v=displayfix_20260510",
    "sp_0177": "/species-display/sp_0177_红眼蓝钻神仙_display_white.png?v=displayfix_20260510",
    "sp_0178": "/species-display/sp_0178_熊猫神仙_display_white.png?v=displayfix_20260510",
    "sp_0240": "/species-display/sp_0240_白金神仙_长鳍_display_white.png?v=displayfix_20260510",
    "sp_0241": "/species-display/sp_0241_大理石神仙_球形_display_white.png?v=displayfix_20260510",
    "sp_0247": "/species-display/sp_0247_蓝钻神仙_球形_display_white.png?v=displayfix_20260510",
    "sp_0272": "/species-display/sp_0272_长鳍神仙_黑_display_white.png?v=displayfix_20260510",
    "sp_0388": "/species-display/sp_0388_血钻神仙_改良_display_white.png?v=displayfix_20260510",
    "sp_0446": "/species-display/sp_0446_神仙鱼_display_white.png?v=displayfix_20260510",
}

VISIBILITY_IMAGE_OVERRIDE_IDS = {
    "sp_0117",
    "sp_0132",
    "sp_0146",
    "sp_0148",
    "sp_0156",
    "sp_0160",
    "sp_0169",
    "sp_0171",
    "sp_0174",
    "sp_0207",
    "sp_0214",
    "sp_0217",
    "sp_0220",
    "sp_0223",
    "sp_0224",
    "sp_0226",
    "sp_0229",
    "sp_0231",
    "sp_0232",
    "sp_0233",
    "sp_0235",
    "sp_0236",
    "sp_0240",
    "sp_0242",
    "sp_0246",
    "sp_0252",
    "sp_0254",
    "sp_0256",
    "sp_0263",
    "sp_0264",
    "sp_0270",
    "sp_0271",
    "sp_0281",
    "sp_0284",
    "sp_0288",
    "sp_0294",
    "sp_0338",
    "sp_0341",
    "sp_0358",
    "sp_0360",
    "sp_0375",
    "sp_0377",
    "sp_0378",
    "sp_0379",
    "sp_0380",
    "sp_0381",
    "sp_0382",
    "sp_0383",
    "sp_0384",
    "sp_0385",
    "sp_0389",
    "sp_0393",
    "sp_0399",
    "sp_0409",
    "sp_0414",
    "sp_0415",
    "sp_0418",
    "sp_0421",
    "sp_0452",
    "sp_0458",
}

KNOWN_MANUAL_ISSUES = {}

KNOWN_MANUAL_ISSUES_BY_KEY = {
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


def display_image_for(fish: dict) -> str:
    # Keep this aligned with src/lib/speciesVisual.ts so the audit checks the
    # image the app actually renders, not only the raw data source.
    fish_id = fish.get("id", "")
    if fish_id in ENCYCLOPEDIA_DISPLAY_IMAGE_OVERRIDES:
        return ENCYCLOPEDIA_DISPLAY_IMAGE_OVERRIDES[fish_id]
    if fish_id in VISIBILITY_IMAGE_OVERRIDE_IDS:
        return f"/species-image-overrides/{fish_id}.png?v=visibility_20260611"
    return fish.get("image", "")


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
            "width": "",
            "height": "",
            "foreground_ratio": "",
            "bbox_fill_ratio": "",
            "largest_component_ratio": "",
            "foreground_luma": "",
            "foreground_chroma": "",
            "edge_margin_px": "",
            "edge_touch": "",
            "bbox": "",
            "crop_safe": "unknown",
            "auto_issue": "",
            "auto_note": "外链参考图，跳过本地透明图像素检查",
        }

    if not path.exists():
        return {
            "exists": "no",
            "width": "0",
            "height": "0",
            "foreground_ratio": "0",
            "bbox_fill_ratio": "0",
            "largest_component_ratio": "0",
            "foreground_luma": "0",
            "foreground_chroma": "0",
            "edge_margin_px": "0",
            "edge_touch": "yes",
            "bbox": "",
            "crop_safe": "no",
            "auto_issue": "missing_file",
            "auto_note": "图片文件不存在",
        }

    with Image.open(path) as img:
        arr = np.array(img.convert("RGBA"))
        width, height = img.size

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
            "width": str(width),
            "height": str(height),
            "foreground_ratio": "0",
            "bbox_fill_ratio": "0",
            "largest_component_ratio": "0",
            "foreground_luma": "0",
            "foreground_chroma": "0",
            "edge_margin_px": "0",
            "edge_touch": "yes",
            "bbox": "",
            "crop_safe": "no",
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
    foreground_rgb = arr[:, :, :3][mask].astype(np.float32)
    foreground_luma = (
        foreground_rgb[:, 0] * 0.2126
        + foreground_rgb[:, 1] * 0.7152
        + foreground_rgb[:, 2] * 0.0722
    )
    foreground_chroma = foreground_rgb.max(axis=1) - foreground_rgb.min(axis=1)
    mean_luma = float(foreground_luma.mean())
    mean_chroma = float(foreground_chroma.mean())
    low_contrast_light_subject = mean_luma > 205 and mean_chroma < 42
    h, w = mask.shape
    edge_margin = min(min_x, min_y, w - 1 - max_x, h - 1 - max_y)
    edge_touch = min_x <= 1 or min_y <= 1 or max_x >= w - 2 or max_y >= h - 2

    issue = ""
    notes: list[str] = []
    crop_safe = "yes"
    if fg_ratio < 0.015:
        issue = "tiny_subject"
        crop_safe = "review"
        notes.append("主体面积过小，可能被抠掉")
    if component_ratio < 0.55:
        issue = issue or "fragmented_subject"
        crop_safe = "review"
        notes.append("主体碎片化，可能只剩鳍/线条/局部")
    if bbox_fill < 0.05:
        issue = issue or "sparse_cutout"
        crop_safe = "review"
        notes.append("透明图有效像素过稀，可能残留线条或主体不完整")
    if edge_touch:
        issue = issue or "edge_touch"
        crop_safe = "no"
        notes.append("主体或残留像素贴边，有被裁切风险")
    elif edge_margin < 32:
        issue = issue or "low_edge_margin"
        crop_safe = "review"
        notes.append(f"主体透明安全边距偏小（{edge_margin}px），小缩略图或3D贴图可能视觉裁切")
    if low_contrast_light_subject:
        issue = issue or "low_contrast_light_subject"
        crop_safe = "review"
        notes.append("浅色主体在白底上对比不足，App 中可能看起来像身体被抠掉")

    return {
        "exists": "yes",
        "width": str(width),
        "height": str(height),
        "foreground_ratio": f"{fg_ratio:.4f}",
        "bbox_fill_ratio": f"{bbox_fill:.4f}",
        "largest_component_ratio": f"{component_ratio:.4f}",
        "foreground_luma": f"{mean_luma:.1f}",
        "foreground_chroma": f"{mean_chroma:.1f}",
        "edge_margin_px": str(edge_margin),
        "edge_touch": "yes" if edge_touch else "no",
        "bbox": f"{min_x},{min_y},{bbox_w},{bbox_h}",
        "crop_safe": crop_safe,
        "auto_issue": issue,
        "auto_note": "；".join(notes),
    }


def relative_thumb_src(path: Optional[Path]) -> str:
    if path is None or not path.exists():
        return ""
    return html.escape(Path("../../").joinpath(path.relative_to(ROOT)).as_posix(), quote=True)


def render_html(rows: list[dict], rework_rows: list[dict]) -> None:
    high = sum(1 for row in rework_rows if row["severity"] == "high")
    crop_risk = sum(1 for row in rows if row["crop_safe"] != "yes")
    missing = sum(1 for row in rows if row["exists"] == "no")

    def badge_class(row: dict) -> str:
        if row["severity"] == "high" or row["crop_safe"] == "no":
            return "bad"
        if row["issue"] or row["crop_safe"] == "review":
            return "warn"
        return "ok"

    body_rows = []
    for row in rows:
        thumb = row.get("thumb", "")
        thumb_html = f'<img src="{thumb}" alt="{html.escape(row["name"], quote=True)}" loading="lazy" />' if thumb else '<span class="noimg">无图</span>'
        body_rows.append(f"""
          <tr class="{badge_class(row)}">
            <td>{thumb_html}</td>
            <td><strong>{html.escape(row["name"])}</strong><br><span>{html.escape(row["scientificName"])}</span><br><code>{html.escape(row["id"])}</code></td>
            <td>{html.escape(row["category"])}</td>
            <td><b>{html.escape(row["crop_safe"])}</b><br><span>边距 {html.escape(row["edge_margin_px"])}px</span><br><span>{html.escape(row["bbox"])}</span></td>
            <td>{html.escape(row["foreground_ratio"])} / {html.escape(row["bbox_fill_ratio"])}<br><span>主体完整度 {html.escape(row["largest_component_ratio"])}</span><br><span>亮度/色差 {html.escape(row.get("foreground_luma", ""))} / {html.escape(row.get("foreground_chroma", ""))}</span></td>
            <td><b>{html.escape(row["issue"] or "ok")}</b><br><span>{html.escape(row["note"])}</span></td>
            <td><code>{html.escape(row["displayImage"])}</code></td>
          </tr>
        """)

    AUDIT_HTML.write_text(f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AquaGuide 图片质量审核表</title>
  <style>
    body {{ margin: 0; padding: 24px; background: #f5f7f3; color: #17251f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; }}
    .muted {{ color: #67746d; font-size: 13px; line-height: 1.7; }}
    .summary {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 20px; }}
    .pill {{ border: 1px solid #d7ddd7; background: white; padding: 8px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }}
    table {{ width: 100%; border-collapse: collapse; background: white; font-size: 12px; }}
    th, td {{ border: 1px solid #dfe5df; padding: 8px; text-align: left; vertical-align: middle; }}
    th {{ position: sticky; top: 0; z-index: 2; background: #173f32; color: white; }}
    td:first-child {{ width: 96px; }}
    img {{ width: 88px; height: 68px; object-fit: contain; background: #fff; border: 1px solid #e4e8e4; border-radius: 6px; padding: 8px; box-sizing: border-box; }}
    code {{ font-size: 11px; color: #526159; word-break: break-all; }}
    span {{ color: #68766e; }}
    tr.ok {{ background: #ffffff; }}
    tr.warn {{ background: #fff8e8; }}
    tr.bad {{ background: #fff1f1; }}
    .noimg {{ display: inline-flex; width: 88px; height: 68px; align-items: center; justify-content: center; border: 1px dashed #d7ddd7; color: #999; }}
  </style>
</head>
<body>
  <h1>AquaGuide 图片质量审核表</h1>
  <p class="muted">用于检查 App 实际展示图片是否存在缺失、主体贴边、透明抠图过碎、主体过小等问题。页面缩略图全部使用 object-fit: contain 和安全内边距预览，不会在审核表里二次裁切。</p>
  <div class="summary">
    <span class="pill">总数：{len(rows)}</span>
    <span class="pill">需复查：{len(rework_rows)}</span>
    <span class="pill">高优先级：{high}</span>
    <span class="pill">裁切/边缘风险：{crop_risk}</span>
    <span class="pill">缺失文件：{missing}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>预览</th>
        <th>物种</th>
        <th>旧分类</th>
        <th>裁切安全</th>
        <th>像素指标</th>
        <th>问题</th>
        <th>App展示图</th>
      </tr>
    </thead>
    <tbody>
      {''.join(body_rows)}
    </tbody>
  </table>
</body>
</html>
""", encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    rework_rows = []

    for fish in load_fish_data():
        display_image = display_image_for(fish)
        path = image_path(display_image)
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
            "displayImage": display_image,
            "file": str(path) if path else fish.get("image", ""),
            "thumb": relative_thumb_src(path),
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
        "displayImage",
        "file",
        "thumb",
        "exists",
        "width",
        "height",
        "foreground_ratio",
        "bbox_fill_ratio",
        "largest_component_ratio",
        "foreground_luma",
        "foreground_chroma",
        "edge_margin_px",
        "edge_touch",
        "bbox",
        "crop_safe",
        "auto_issue",
        "auto_note",
        "issue",
        "severity",
        "note",
    ]
    with AUDIT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    with REWORK_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rework_rows)

    render_html(rows, rework_rows)

    high = sum(1 for row in rework_rows if row["severity"] == "high")
    print(f"audited={len(rows)}")
    print(f"rework_candidates={len(rework_rows)}")
    print(f"high_priority={high}")
    print(f"audit_csv={AUDIT_CSV}")
    print(f"rework_csv={REWORK_CSV}")
    print(f"audit_html={AUDIT_HTML}")


if __name__ == "__main__":
    main()
