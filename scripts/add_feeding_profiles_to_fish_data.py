#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
FEEDING_DIR = ROOT.parent / "feeding_output"
FEEDING_CSV = FEEDING_DIR / "feeding_profiles_app_complete.csv"
REVIEW_CSV = FEEDING_DIR / "feeding_profiles_final.csv"


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def base_scientific(value: str) -> str:
    value = norm(value).replace(" var.", "")
    parts = value.split()
    return " ".join(parts[:2]) if len(parts) >= 2 else value


def load_fish_data():
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Could not parse fishData.ts")
    return json.loads(match.group(1))


def load_rows(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def bucket_index(rows, key_fn):
    buckets = {}
    for row in rows:
        key = key_fn(row)
        if key:
            buckets.setdefault(key, []).append(row)
    return buckets


def distinct_rows(rows):
    distinct = []
    seen = set()
    for row in rows:
        signature = tuple(sorted((key, value or "") for key, value in row.items()))
        if signature in seen:
            continue
        seen.add(signature)
        distinct.append(row)
    return distinct


def find_best_row(rows_by_name, rows_by_sci, rows_by_base_sci, common_name, scientific_name):
    name_candidates = distinct_rows(rows_by_name.get(common_name, []))
    exact_name_and_sci = [row for row in name_candidates if norm(row.get("scientific_name", "")) == scientific_name]
    if len(exact_name_and_sci) == 1:
        return exact_name_and_sci[0], False
    if len(name_candidates) == 1:
        return name_candidates[0], False

    sci_candidates = distinct_rows(rows_by_sci.get(scientific_name, []))
    exact_sci_and_name = [row for row in sci_candidates if norm(row.get("common_name", "")) == common_name]
    if len(exact_sci_and_name) == 1:
        return exact_sci_and_name[0], False
    if len(sci_candidates) == 1:
        return sci_candidates[0], False

    base_candidates = distinct_rows(rows_by_base_sci.get(base_scientific(scientific_name), []))
    if len(base_candidates) == 1:
        return base_candidates[0], True
    return None, False


def parse_bool(value: str) -> bool:
    return norm(value) in {"yes", "true", "1", "是"}


def parse_source_fields(value: str):
    return [item.strip() for item in re.split(r"[,，;；]+", value or "") if item.strip()]


def clean_special_notes(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""

    # The source CSV keeps provenance notes together with app-facing copy.
    # Keep useful husbandry advice, but remove source labels and repeated fragments.
    raw_parts = re.split(r"[；;\n]+", text)
    parts = []
    seen = set()
    banned = [
        "使用同类群通用喂养模板生成",
        "适合第一版上线",
        "特殊喂养关键词已转为 App 提示语",
    ]

    for raw_part in raw_parts:
        part = raw_part.strip(" 。；;")
        part = re.sub(r"^补充文档[:：]\s*", "", part).strip(" 。；;")
        if not part:
            continue
        if any(marker in part for marker in banned):
            continue

        normalized = re.sub(r"[\s。；;，,、：:（）()]+", "", part)
        if not normalized or normalized in seen:
            continue
        if any(normalized in existing or existing in normalized for existing in seen):
            continue

        parts.append(part)
        seen.add(normalized)

    return "；".join(parts)


def to_profile(row, review_row=None, inherited=False):
    review_row = review_row or row
    review_reasons = [review_row.get("review_reason", "").strip()]
    if inherited:
        review_reasons.append("仅按学名主干继承近缘变种资料，需人工确认")
    return {
        "dietType": row.get("diet_type", ""),
        "feedingType": row.get("feeding_type_cn", "") or "杂食性",
        "recommendedFoods": row.get("recommended_foods", "") or "优质人工饲料",
        "feedingFrequency": row.get("feeding_frequency", "") or "每天1次，少量多次更稳妥",
        "portionRule": row.get("portion_rule", "") or "以2-3分钟内吃完为宜，残饵及时清理",
        "feedingLayer": row.get("feeding_layer", ""),
        "avoidFoods": row.get("avoid_foods", "") or "过量投喂；变质饲料；长期残饵",
        "specialNotes": clean_special_notes(row.get("special_notes", "")),
        "confidence": row.get("confidence", ""),
        "sourceName": row.get("source_name", ""),
        "sourceUrl": row.get("source_url", "") or review_row.get("source_url", ""),
        "sourceFields": parse_source_fields(row.get("source_fields", "") or review_row.get("source_fields", "")),
        "needsReview": parse_bool(review_row.get("needs_review", "")) or inherited,
        "reviewReason": "；".join(reason for reason in review_reasons if reason),
    }


def fallback_profile(fish):
    name = fish.get("name", "")
    category = fish.get("category", "")
    temperament = fish.get("temperament", "")
    size = fish.get("size", "")
    blob = f"{name} {category}"

    if any(x in blob for x in ["龟", "角蛙", "蝾螈", "六角恐龙"]):
        return {
            "dietType": "Carnivore/Omnivore",
            "feedingType": "肉食/杂食性",
            "recommendedFoods": "专用龟粮/两栖饲料+冻红虫+蚯蚓+小型水生昆虫",
            "feedingFrequency": "幼体每天少量，成体每周3-5次",
            "portionRule": "以短时间吃完为准，残饵及时取出，避免污染水质",
            "feedingLayer": "底层/水陆交界",
            "avoidFoods": "长期只喂单一肉类；高盐高油人类食物；过量活饵",
            "specialNotes": "两栖/爬宠类与鱼类喂养逻辑不同，需要单独关注钙质、晒背或水陆环境。",
            "confidence": "0.72",
            "sourceName": "rule_fallback",
        }

    if any(x in blob for x in ["水草", "草", "榕", "藻", "萍", "蕨", "椒草"]):
        return {
            "dietType": "Autotroph",
            "feedingType": "光合作用",
            "recommendedFoods": "充足光照+根肥/液肥+稳定二氧化碳",
            "feedingFrequency": "按水草状态每周少量补肥",
            "portionRule": "少量多次，避免一次性过量导致藻类爆发",
            "feedingLayer": "造景/底床",
            "avoidFoods": "过量肥料；长时间弱光；底床贫瘠",
            "specialNotes": "水草不是投喂对象，核心是光照、底床、肥料和二氧化碳平衡。",
            "confidence": "0.75",
            "sourceName": "rule_fallback",
        }

    if any(x in blob for x in ["虾", "螺", "蟹"]):
        return {
            "dietType": "Omnivore",
            "feedingType": "杂食/刮食性",
            "recommendedFoods": "藻类+虾粮/螺粮+焯熟蔬菜",
            "feedingFrequency": "每周2-3次少量补喂",
            "portionRule": "2小时内吃完，残饵及时取出",
            "feedingLayer": "底层/缸壁",
            "avoidFoods": "含铜药物；长期残饵；过量动物蛋白",
            "specialNotes": "虾螺对水质和药物敏感，补喂要少，成熟缸内自然藻膜很重要。",
            "confidence": "0.78",
            "sourceName": "rule_fallback",
        }

    if "海水" in category or any(x in blob for x in ["珊瑚", "海葵"]):
        return {
            "dietType": "Marine mixed",
            "feedingType": "海水专用",
            "recommendedFoods": "海水颗粒/糠虾/丰年虾；珊瑚类补充浮游生物或珊瑚粮",
            "feedingFrequency": "鱼类每天1-2次；珊瑚每周1-3次少量",
            "portionRule": "少量投喂，保持硝酸盐和磷酸盐稳定",
            "feedingLayer": "中层/珊瑚位",
            "avoidFoods": "淡水饲料长期替代；过量投喂导致营养盐飙升",
            "specialNotes": "海水缸喂食要和蛋分、过滤、盐度稳定一起管理。",
            "confidence": "0.76",
            "sourceName": "rule_fallback",
        }

    if temperament == "Aggressive" or size == "Large":
        return {
            "dietType": "Carnivore/Omnivore",
            "feedingType": "肉食/杂食性",
            "recommendedFoods": "高蛋白颗粒+冻虾+鱼肉/昆虫类饵料",
            "feedingFrequency": "每天1次或隔天1次，视体型和消化速度调整",
            "portionRule": "腹部微鼓即可，避免一次喂太饱",
            "feedingLayer": "中上层/底层视物种而定",
            "avoidFoods": "长期喂活鱼；高脂肪肉类；过量投喂",
            "specialNotes": "大型或凶猛鱼污染量高，喂食后要观察残饵和水质变化。",
            "confidence": "0.74",
            "sourceName": "rule_fallback",
        }

    return {
        "dietType": "Omnivore",
        "feedingType": "杂食性",
        "recommendedFoods": "优质微颗粒/薄片饲料+丰年虾+冻红虫少量搭配",
        "feedingFrequency": "每天1-2次",
        "portionRule": "每次2-3分钟内吃完，宁少勿多",
        "feedingLayer": "中层",
        "avoidFoods": "过量投喂；长期单一饲料；变质饲料",
        "specialNotes": "小型温和鱼更适合少量多次，群游鱼抢食弱的个体要单独观察。",
        "confidence": "0.74",
        "sourceName": "rule_fallback",
    }


def main():
    fish_data = load_fish_data()
    feeding_rows = load_rows(FEEDING_CSV)
    review_rows = load_rows(REVIEW_CSV)
    by_name = bucket_index(feeding_rows, lambda row: norm(row["common_name"]))
    by_sci = bucket_index(feeding_rows, lambda row: norm(row["scientific_name"]))
    by_base_sci = bucket_index(feeding_rows, lambda row: base_scientific(row["scientific_name"]))
    review_by_name = bucket_index(review_rows, lambda row: norm(row["common_name"]))
    review_by_sci = bucket_index(review_rows, lambda row: norm(row["scientific_name"]))

    matched = 0
    fallback = 0
    inherited = 0
    review_required = 0
    for fish in fish_data:
        fish_name = norm(fish.get("name", ""))
        fish_sci = norm(fish.get("scientificName", ""))
        row, inherited_match = find_best_row(by_name, by_sci, by_base_sci, fish_name, fish_sci)
        if row:
            review_row, _ = find_best_row(
                review_by_name,
                review_by_sci,
                {},
                norm(row.get("common_name", "")),
                norm(row.get("scientific_name", "")),
            )
            profile = to_profile(row, review_row, inherited=inherited_match)
            matched += 1
            inherited += int(inherited_match)
        else:
            profile = fallback_profile(fish)
            profile.update({
                "sourceUrl": "",
                "sourceFields": [],
                "needsReview": True,
                "reviewReason": "未匹配到物种专属喂养资料，当前仅提供类别通用参考",
            })
            fallback += 1

        review_required += int(profile.get("needsReview", False))

        fish["feedingProfile"] = profile
        fish["diet"] = f"{profile['feedingType']}：{profile['recommendedFoods']}。频率：{profile['feedingFrequency']}。"

    text = "import { Fish } from '../types';\n\n"
    text += "export const fishData: Fish[] = "
    text += json.dumps(fish_data, ensure_ascii=False, indent=2)
    text += ";\n"
    FISH_DATA_TS.write_text(text, encoding="utf-8")

    print(f"updated={len(fish_data)}")
    print(f"matched_complete_profiles={matched}")
    print(f"fallback_profiles={fallback}")
    print(f"inherited_profiles={inherited}")
    print(f"needs_review_profiles={review_required}")


if __name__ == "__main__":
    main()
