from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path("/Users/chuchu/.codex/generated_images/019e7473-61ef-79b3-8104-d194dff47756")


SHEETS = [
    {
        "source": GENERATED / "ig_0a6c6003a779f4d7016a1c2dc4abb881a083c2185341767cd5.png",
        "columns": 5,
        "rows": 2,
        "output_dir": ROOT / "public/species-generated/plants",
        "names": [
            "sp_0477_glossostigma.png",
            "sp_0478_eleocharis_parvula.png",
            "sp_0479_alternanthera_reineckii.png",
            "sp_0480_bacopa_monnieri.png",
            "sp_0481_hygrophila_difformis.png",
            "sp_0482_ludwigia_repens.png",
            "sp_0483_proserpinaca_palustris.png",
            "sp_0484_phyllanthus_fluitans.png",
            "sp_0485_ceratopteris_thalictroides.png",
            "sp_0486_sagittaria_subulata.png",
        ],
    },
    {
        "source": GENERATED / "ig_0a6c6003a779f4d7016a1c2dfd3c7481a0a4e2edb807f26d94.png",
        "columns": 4,
        "rows": 2,
        "output_dir": ROOT / "public/species-generated/turtles",
        "names": [
            "sp_0460_red_eared_slider.png",
            "sp_0461_chinese_pond_turtle.png",
            "sp_0462_chinese_stripe_necked_turtle.png",
            "sp_0463_razorback_musk_turtle.png",
            "sp_0464_giant_musk_turtle.png",
            "sp_0465_pig_nosed_turtle.png",
            "sp_0466_common_musk_turtle.png",
        ],
    },
]


def crop_sheet(sheet):
    image = Image.open(sheet["source"]).convert("RGB")
    width, height = image.size
    cell_width = width / sheet["columns"]
    cell_height = height / sheet["rows"]
    sheet["output_dir"].mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(sheet["names"]):
        row = index // sheet["columns"]
        column = index % sheet["columns"]
        box = (
            round(column * cell_width),
            round(row * cell_height),
            round((column + 1) * cell_width),
            round((row + 1) * cell_height),
        )
        crop = image.crop(box)
        crop.save(sheet["output_dir"] / name, optimize=True)
        print(sheet["output_dir"] / name)


def main():
    for sheet in SHEETS:
        crop_sheet(sheet)


if __name__ == "__main__":
    main()
