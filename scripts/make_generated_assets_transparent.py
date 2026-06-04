from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIR = ROOT / "public/species-generated"


def is_background(pixel):
    r, g, b, _a = pixel
    return r >= 185 and g >= 185 and b >= 185 and max(r, g, b) - min(r, g, b) <= 28


def transparentize_edges(path: Path):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue = deque()

    def index(x, y):
        return y * width + x

    def enqueue_if_bg(x, y):
        i = index(x, y)
        if visited[i]:
            return
        visited[i] = 1
        if is_background(pixels[x, y]):
            queue.append((x, y))

    for x in range(width):
        enqueue_if_bg(x, 0)
        enqueue_if_bg(x, height - 1)
    for y in range(height):
        enqueue_if_bg(0, y)
        enqueue_if_bg(width - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue_if_bg(nx, ny)

    image.save(path, optimize=True)
    print(path.relative_to(ROOT))


def main():
    for path in sorted(TARGET_DIR.glob("**/*.png")):
      transparentize_edges(path)


if __name__ == "__main__":
    main()
