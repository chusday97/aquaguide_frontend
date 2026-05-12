#!/usr/bin/env python3
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FISH_DATA_TS = ROOT / "src/data/fishData.ts"


def load_fish_data():
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);\s*$", text, re.S)
    if not match:
        raise RuntimeError("Could not parse fishData.ts")
    return json.loads(match.group(1))


def infer_housing(fish):
    name = fish.get("name", "")
    sci = fish.get("scientificName", "")
    category = fish.get("category", "")
    temperament = fish.get("temperament", "Peaceful")
    size = fish.get("size", "Small")
    blob = f"{name} {sci} {category}"

    if any(token in blob for token in ["水草", "硬景", "底床", "沉木", "石", "榕", "藻", "萍", "蕨", "椒草", "Moss", "Anubias", "Cryptocoryne"]):
        return "适合混养", "属于造景或植物类，不会主动攻击鱼虾；主要注意光照、底床和是否会被草食性鱼啃食。"

    if any(token in blob for token in ["龟", "角蛙", "蝾螈", "六角恐龙", "Ambystoma", "Ceratophrys", "Cynops"]):
        return "建议单养", "两栖/爬宠与观赏鱼的环境需求和捕食风险差异较大，容易咬伤或吞食小鱼，建议单独饲养。"

    if any(token in blob for token in ["斗鱼", "Betta"]):
        return "建议单养", "斗鱼有明显领地意识，同类或长鳍鱼混养容易追咬；新手更适合单独饲养或非常谨慎搭配底栖温和生物。"

    if any(token in blob for token in ["魟", "龙鱼", "雀鳝", "恐龙鱼", "狮子鱼", "狗头", "娃娃", "河豚", "Puffer", "Potamotrygon", "Scleropages"]):
        return "建议单养", "该类生物捕食性强或体型差异风险高，容易吞食小鱼、小虾或攻击同缸生物，建议单独饲养或专业级混养。"

    if any(token in blob for token in ["地图鱼", "罗汉", "非洲王子", "慈鲷", "Cichlid", "Cichlidae"]):
        return "谨慎混养", "慈鲷类常有领地意识，繁殖期或空间不足时容易追咬；只建议与体型接近、水质需求一致的鱼混养。"

    if "海水鱼" in category or any(token in blob for token in ["珊瑚", "海葵", "Clownfish", "Tang"]):
        return "谨慎混养", "海水生物需要稳定盐度和成熟系统；鱼、珊瑚、海葵之间存在捕食、蛰伤或领地风险，需要按珊瑚缸兼容性搭配。"

    if any(token in blob for token in ["虾", "螺", "蟹", "Shrimp", "Snail", "Crab"]):
        return "谨慎混养", "虾螺蟹通常性情温和，但可能被中大型鱼或肉食鱼捕食；也要避免铜药和会夹鱼的蟹类。"

    if temperament == "Aggressive":
        return "建议单养", "性情偏凶或捕食倾向明显，和温和小型鱼混养容易造成追咬、压迫或吞食。"

    if temperament == "Territorial":
        return "谨慎混养", "有一定领地意识，混养时需要足够空间、躲避物，并避免与同体型同习性的鱼过密饲养。"

    if size == "Large":
        return "谨慎混养", "体型较大，可能压迫或误食小型鱼虾；适合与体型接近、游层错开的温和鱼混养。"

    if any(token in blob for token in ["灯", "Tetra", "斑马", "孔雀", "鼠鱼", "Corydoras", "Otocinclus"]):
        return "适合混养", "性情通常温和，适合与体型接近、水温和 pH 区间重叠的温和鱼群混养；群游鱼建议成群饲养。"

    return "适合混养", "性情相对温和，可与体型接近、水质需求相同的温和物种混养；仍需避免过密饲养和体型差异过大。"


def main():
    data = load_fish_data()
    counts = {}
    for fish in data:
        mode, reason = infer_housing(fish)
        fish["housingMode"] = mode
        fish["housingReason"] = reason
        counts[mode] = counts.get(mode, 0) + 1

    text = "import { Fish } from '../types';\n\n"
    text += "export const fishData: Fish[] = "
    text += json.dumps(data, ensure_ascii=False, indent=2)
    text += ";\n"
    FISH_DATA_TS.write_text(text, encoding="utf-8")

    print(f"updated={len(data)}")
    for key in ["适合混养", "谨慎混养", "建议单养"]:
        print(f"{key}={counts.get(key, 0)}")


if __name__ == "__main__":
    main()
