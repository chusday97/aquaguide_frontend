from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = [
    ROOT / "public/species-transparent",
    ROOT / "public/species-display",
    ROOT / "public/species-generated",
]


def is_edge_background(pixel):
    r, g, b, a = pixel
    if a <= 8:
        return True
    bright_neutral = r >= 185 and g >= 185 and b >= 185 and max(r, g, b) - min(r, g, b) <= 42
    near_white = r >= 220 and g >= 220 and b >= 220
    return bright_neutral or near_white


def remove_connected_edge_background(image):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue = deque()

    def index(x, y):
        return y * width + x

    def enqueue_if_background(x, y):
        i = index(x, y)
        if visited[i]:
            return
        visited[i] = 1
        if is_edge_background(pixels[x, y]):
            queue.append((x, y))

    for x in range(width):
        enqueue_if_background(x, 0)
        enqueue_if_background(x, height - 1)
    for y in range(height):
        enqueue_if_background(0, y)
        enqueue_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue_if_background(nx, ny)

    return image


def soften_alpha_edge(image):
    r, g, b, a = image.split()
    softened_alpha = a.filter(ImageFilter.GaussianBlur(radius=0.45))
    return Image.merge("RGBA", (r, g, b, softened_alpha))


def add_safe_padding(image, min_padding_ratio=0.1):
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image

    width, height = image.size
    left, top, right, bottom = bbox
    target_pad_x = max(8, round((right - left) * min_padding_ratio))
    target_pad_y = max(8, round((bottom - top) * min_padding_ratio))

    current_pad_left = left
    current_pad_top = top
    current_pad_right = width - right
    current_pad_bottom = height - bottom

    add_left = max(0, target_pad_x - current_pad_left)
    add_top = max(0, target_pad_y - current_pad_top)
    add_right = max(0, target_pad_x - current_pad_right)
    add_bottom = max(0, target_pad_y - current_pad_bottom)

    if add_left == add_top == add_right == add_bottom == 0:
        return image

    canvas = Image.new("RGBA", (width + add_left + add_right, height + add_top + add_bottom), (255, 255, 255, 0))
    canvas.alpha_composite(image, (add_left, add_top))
    return canvas


def repair_image(path):
    before = Image.open(path).convert("RGBA")
    repaired = remove_connected_edge_background(before)
    repaired = soften_alpha_edge(repaired)
    repaired = add_safe_padding(repaired)
    repaired.save(path, optimize=True)

    before_alpha_bbox = before.getchannel("A").getbbox()
    after_alpha_bbox = repaired.getchannel("A").getbbox()
    return before.size, repaired.size, before_alpha_bbox, after_alpha_bbox


def main():
    changed = 0
    for target_dir in TARGET_DIRS:
        if not target_dir.exists():
            continue
        for path in sorted(target_dir.glob("**/*.png")):
            before_size, after_size, before_bbox, after_bbox = repair_image(path)
            changed += 1
            print(
                f"{path.relative_to(ROOT)} | {before_size}->{after_size} | "
                f"bbox {before_bbox}->{after_bbox}"
            )
    print(f"repaired {changed} png files")


if __name__ == "__main__":
    main()
