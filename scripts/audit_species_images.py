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
    "sp_0001",
    "sp_0002",
    "sp_0003",
    "sp_0004",
    "sp_0005",
    "sp_0006",
    "sp_0007",
    "sp_0008",
    "sp_0009",
    "sp_0010",
    "sp_0011",
    "sp_0012",
    "sp_0013",
    "sp_0014",
    "sp_0015",
    "sp_0016",
    "sp_0017",
    "sp_0018",
    "sp_0019",
    "sp_0020",
    "sp_0021",
    "sp_0022",
    "sp_0023",
    "sp_0024",
    "sp_0025",
    "sp_0026",
    "sp_0027",
    "sp_0028",
    "sp_0029",
    "sp_0030",
    "sp_0031",
    "sp_0032",
    "sp_0033",
    "sp_0034",
    "sp_0035",
    "sp_0036",
    "sp_0037",
    "sp_0038",
    "sp_0039",
    "sp_0040",
    "sp_0041",
    "sp_0042",
    "sp_0043",
    "sp_0044",
    "sp_0045",
    "sp_0046",
    "sp_0047",
    "sp_0048",
    "sp_0049",
    "sp_0050",
    "sp_0051",
    "sp_0052",
    "sp_0053",
    "sp_0054",
    "sp_0055",
    "sp_0056",
    "sp_0057",
    "sp_0058",
    "sp_0059",
    "sp_0060",
    "sp_0061",
    "sp_0062",
    "sp_0063",
    "sp_0064",
    "sp_0065",
    "sp_0066",
    "sp_0067",
    "sp_0068",
    "sp_0069",
    "sp_0070",
    "sp_0071",
    "sp_0072",
    "sp_0073",
    "sp_0074",
    "sp_0075",
    "sp_0076",
    "sp_0077",
    "sp_0078",
    "sp_0079",
    "sp_0080",
    "sp_0081",
    "sp_0082",
    "sp_0083",
    "sp_0084",
    "sp_0085",
    "sp_0086",
    "sp_0087",
    "sp_0088",
    "sp_0089",
    "sp_0090",
    "sp_0091",
    "sp_0092",
    "sp_0093",
    "sp_0094",
    "sp_0095",
    "sp_0096",
    "sp_0097",
    "sp_0098",
    "sp_0099",
    "sp_0100",
    "sp_0101",
    "sp_0102",
    "sp_0103",
    "sp_0104",
    "sp_0105",
    "sp_0106",
    "sp_0107",
    "sp_0108",
    "sp_0109",
    "sp_0110",
    "sp_0111",
    "sp_0112",
    "sp_0113",
    "sp_0114",
    "sp_0115",
    "sp_0117",
    "sp_0118",
    "sp_0119",
    "sp_0120",
    "sp_0121",
    "sp_0122",
    "sp_0123",
    "sp_0124",
    "sp_0125",
    "sp_0126",
    "sp_0127",
    "sp_0128",
    "sp_0129",
    "sp_0130",
    "sp_0131",
    "sp_0132",
    "sp_0133",
    "sp_0134",
    "sp_0135",
    "sp_0136",
    "sp_0137",
    "sp_0138",
    "sp_0139",
    "sp_0140",
    "sp_0141",
    "sp_0142",
    "sp_0143",
    "sp_0144",
    "sp_0145",
    "sp_0146",
    "sp_0147",
    "sp_0148",
    "sp_0149",
    "sp_0150",
    "sp_0152",
    "sp_0153",
    "sp_0154",
    "sp_0155",
    "sp_0156",
    "sp_0157",
    "sp_0158",
    "sp_0159",
    "sp_0160",
    "sp_0161",
    "sp_0162",
    "sp_0163",
    "sp_0164",
    "sp_0165",
    "sp_0166",
    "sp_0167",
    "sp_0168",
    "sp_0169",
    "sp_0170",
    "sp_0171",
    "sp_0172",
    "sp_0173",
    "sp_0174",
    "sp_0175",
    "sp_0176",
    "sp_0177",
    "sp_0178",
    "sp_0179",
    "sp_0180",
    "sp_0181",
    "sp_0182",
    "sp_0183",
    "sp_0184",
    "sp_0185",
    "sp_0186",
    "sp_0187",
    "sp_0188",
    "sp_0189",
    "sp_0190",
    "sp_0191",
    "sp_0192",
    "sp_0193",
    "sp_0194",
    "sp_0195",
    "sp_0196",
    "sp_0197",
    "sp_0198",
    "sp_0199",
    "sp_0200",
    "sp_0201",
    "sp_0202",
    "sp_0203",
    "sp_0204",
    "sp_0205",
    "sp_0206",
    "sp_0207",
    "sp_0208",
    "sp_0209",
    "sp_0210",
    "sp_0211",
    "sp_0212",
    "sp_0213",
    "sp_0214",
    "sp_0215",
    "sp_0216",
    "sp_0217",
    "sp_0218",
    "sp_0219",
    "sp_0220",
    "sp_0221",
    "sp_0222",
    "sp_0223",
    "sp_0224",
    "sp_0225",
    "sp_0226",
    "sp_0227",
    "sp_0228",
    "sp_0229",
    "sp_0230",
    "sp_0231",
    "sp_0232",
    "sp_0233",
    "sp_0234",
    "sp_0235",
    "sp_0236",
    "sp_0237",
    "sp_0238",
    "sp_0239",
    "sp_0240",
    "sp_0241",
    "sp_0242",
    "sp_0243",
    "sp_0244",
    "sp_0245",
    "sp_0246",
    "sp_0247",
    "sp_0248",
    "sp_0249",
    "sp_0250",
    "sp_0251",
    "sp_0252",
    "sp_0253",
    "sp_0254",
    "sp_0255",
    "sp_0256",
    "sp_0257",
    "sp_0258",
    "sp_0259",
    "sp_0260",
    "sp_0261",
    "sp_0262",
    "sp_0263",
    "sp_0264",
    "sp_0265",
    "sp_0266",
    "sp_0267",
    "sp_0268",
    "sp_0269",
    "sp_0270",
    "sp_0271",
    "sp_0272",
    "sp_0273",
    "sp_0274",
    "sp_0275",
    "sp_0276",
    "sp_0277",
    "sp_0278",
    "sp_0279",
    "sp_0280",
    "sp_0281",
    "sp_0282",
    "sp_0283",
    "sp_0284",
    "sp_0285",
    "sp_0286",
    "sp_0287",
    "sp_0288",
    "sp_0289",
    "sp_0290",
    "sp_0291",
    "sp_0292",
    "sp_0293",
    "sp_0294",
    "sp_0295",
    "sp_0296",
    "sp_0297",
    "sp_0298",
    "sp_0299",
    "sp_0300",
    "sp_0301",
    "sp_0302",
    "sp_0303",
    "sp_0305",
    "sp_0306",
    "sp_0307",
    "sp_0308",
    "sp_0309",
    "sp_0310",
    "sp_0311",
    "sp_0312",
    "sp_0313",
    "sp_0314",
    "sp_0315",
    "sp_0316",
    "sp_0317",
    "sp_0318",
    "sp_0319",
    "sp_0320",
    "sp_0321",
    "sp_0322",
    "sp_0323",
    "sp_0324",
    "sp_0325",
    "sp_0326",
    "sp_0327",
    "sp_0328",
    "sp_0329",
    "sp_0330",
    "sp_0331",
    "sp_0332",
    "sp_0333",
    "sp_0334",
    "sp_0335",
    "sp_0336",
    "sp_0337",
    "sp_0338",
    "sp_0339",
    "sp_0340",
    "sp_0341",
    "sp_0342",
    "sp_0343",
    "sp_0344",
    "sp_0345",
    "sp_0346",
    "sp_0347",
    "sp_0348",
    "sp_0349",
    "sp_0350",
    "sp_0351",
    "sp_0352",
    "sp_0353",
    "sp_0354",
    "sp_0355",
    "sp_0356",
    "sp_0357",
    "sp_0358",
    "sp_0359",
    "sp_0360",
    "sp_0361",
    "sp_0362",
    "sp_0363",
    "sp_0364",
    "sp_0365",
    "sp_0366",
    "sp_0367",
    "sp_0368",
    "sp_0369",
    "sp_0370",
    "sp_0371",
    "sp_0372",
    "sp_0373",
    "sp_0374",
    "sp_0375",
    "sp_0376",
    "sp_0377",
    "sp_0378",
    "sp_0379",
    "sp_0380",
    "sp_0381",
    "sp_0382",
    "sp_0383",
    "sp_0384",
    "sp_0385",
    "sp_0386",
    "sp_0387",
    "sp_0388",
    "sp_0389",
    "sp_0390",
    "sp_0391",
    "sp_0392",
    "sp_0393",
    "sp_0394",
    "sp_0395",
    "sp_0396",
    "sp_0397",
    "sp_0398",
    "sp_0399",
    "sp_0400",
    "sp_0401",
    "sp_0402",
    "sp_0403",
    "sp_0404",
    "sp_0405",
    "sp_0406",
    "sp_0407",
    "sp_0408",
    "sp_0409",
    "sp_0410",
    "sp_0411",
    "sp_0412",
    "sp_0413",
    "sp_0414",
    "sp_0415",
    "sp_0416",
    "sp_0417",
    "sp_0418",
    "sp_0419",
    "sp_0420",
    "sp_0421",
    "sp_0422",
    "sp_0423",
    "sp_0424",
    "sp_0425",
    "sp_0426",
    "sp_0427",
    "sp_0428",
    "sp_0429",
    "sp_0430",
    "sp_0431",
    "sp_0432",
    "sp_0433",
    "sp_0434",
    "sp_0435",
    "sp_0436",
    "sp_0437",
    "sp_0438",
    "sp_0439",
    "sp_0440",
    "sp_0441",
    "sp_0442",
    "sp_0443",
    "sp_0444",
    "sp_0445",
    "sp_0448",
    "sp_0449",
    "sp_0450",
    "sp_0451",
    "sp_0452",
    "sp_0453",
    "sp_0454",
    "sp_0455",
    "sp_0456",
    "sp_0457",
    "sp_0458",
    "sp_0459",
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
