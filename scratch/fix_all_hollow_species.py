import sys
import re
import json
import numpy as np
from pathlib import Path
from collections import deque
from PIL import Image, ImageFilter

ROOT = Path("/Users/chuchu/Documents/New project/aquaguide_frontend")
PIPELINE_DIR = Path("/Users/chuchu/Documents/codex/fish_pipeline/output/generated_archive/cropped_species/all_images")
OUTPUT_DIR = ROOT / "public/species-image-overrides"
FISH_DATA_TS = ROOT / "src/data/fishData.ts"
SPECIES_VISUAL_TS = ROOT / "src/lib/speciesVisual.ts"
AUDIT_SCRIPT_PY = ROOT / "scripts/audit_species_images.py"

def load_fish_data() -> list[dict]:
    text = FISH_DATA_TS.read_text(encoding="utf-8")
    match = re.search(r"export const fishData: Fish\[] = (\[.*\]);", text, flags=re.S)
    if not match:
        raise RuntimeError(f"Could not parse fish data from {FISH_DATA_TS}")
    return json.loads(match.group(1))

def is_pixel_background(pixel, bg_color, tolerance) -> bool:
    r, g, b = pixel[:3]
    dist = np.sqrt((r - bg_color[0])**2 + (g - bg_color[1])**2 + (b - bg_color[2])**2)
    if dist > tolerance:
        return False
    # Background must be close to neutral gray
    if max(r, g, b) - min(r, g, b) > 10:
        return False
    return True

def flood_fill_mask(arr_rgb: np.ndarray, bg_color: np.ndarray, tolerance: float) -> np.ndarray:
    h, w, _ = arr_rgb.shape
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Enqueue borders
    for x in range(w):
        if is_pixel_background(arr_rgb[0, x], bg_color, tolerance):
            visited[0, x] = True
            queue.append((0, x))
        if is_pixel_background(arr_rgb[h-1, x], bg_color, tolerance):
            visited[h-1, x] = True
            queue.append((h-1, x))
    for y in range(h):
        if is_pixel_background(arr_rgb[y, 0], bg_color, tolerance):
            visited[y, 0] = True
            queue.append((y, 0))
        if is_pixel_background(arr_rgb[y, w-1], bg_color, tolerance):
            visited[y, w-1] = True
            queue.append((y, w-1))
            
    while queue:
        y, x = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if is_pixel_background(arr_rgb[ny, nx], bg_color, tolerance):
                    visited[ny, nx] = True
                    queue.append((ny, nx))
                    
    return ~visited

def remove_background_adaptively(img_pil: Image.Image) -> Image.Image:
    img_rgb = img_pil.convert("RGB")
    arr_rgb = np.array(img_rgb)
    h, w, _ = arr_rgb.shape
    
    # Get background color from corners
    corners = [
        arr_rgb[0, 0],
        arr_rgb[0, -1],
        arr_rgb[-1, 0],
        arr_rgb[-1, -1]
    ]
    bg_color = np.mean(corners, axis=0)
    
    # 1. Get reference body mask (strict tolerance = 2)
    ref_mask = flood_fill_mask(arr_rgb, bg_color, tolerance=2)
    ref_area = np.sum(ref_mask)
    
    # 2. Iterate from loose to strict tolerance to find the best cut without leak
    best_mask = ref_mask
    best_tol = 2
    for tolerance in [15, 12, 10, 8, 6, 4, 3, 2]:
        mask = flood_fill_mask(arr_rgb, bg_color, tolerance)
        intersection = np.sum(mask & ref_mask)
        
        # If the candidate mask retains at least 95% of the safe reference body pixels, it is safe
        if ref_area > 0 and (intersection / ref_area) >= 0.95:
            best_mask = mask
            best_tol = tolerance
            break
            
    print(f"    Selected adaptive tolerance: {best_tol}")
    
    # Apply mask as alpha
    img_rgba = img_pil.convert("RGBA")
    arr_rgba = np.array(img_rgba)
    arr_rgba[:, :, 3] = np.where(best_mask, 255, 0).astype(np.uint8)
    
    img_cutout = Image.fromarray(arr_rgba)
    
    # Soften alpha edges
    r_ch, g_ch, b_ch, a_ch = img_cutout.split()
    softened_alpha = a_ch.filter(ImageFilter.GaussianBlur(radius=0.45))
    img_cutout = Image.merge("RGBA", (r_ch, g_ch, b_ch, softened_alpha))
    
    # Add safe padding (15%)
    def add_safe_padding(image, min_padding_ratio=0.15):
        alpha = image.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            return image
        w, h = image.size
        left, top, right, bottom = bbox
        target_pad_x = max(16, round((right - left) * min_padding_ratio))
        target_pad_y = max(16, round((bottom - top) * min_padding_ratio))
        
        add_left = max(0, target_pad_x - left)
        add_top = max(0, target_pad_y - top)
        add_right = max(0, target_pad_x - (w - right))
        add_bottom = max(0, target_pad_y - (h - bottom))
        
        if add_left == add_top == add_right == add_bottom == 0:
            return image
            
        canvas = Image.new("RGBA", (w + add_left + add_right, h + add_top + add_bottom), (255, 255, 255, 0))
        canvas.alpha_composite(image, (add_left, add_top))
        return canvas
        
    return add_safe_padding(img_cutout)

def get_hollow_ratio(pipe_path: Path, local_path: Path) -> float:
    try:
        pipe_img = Image.open(pipe_path).convert("RGB")
        arr_rgb = np.array(pipe_img)
        
        # Corners to get bg_color
        corners = [arr_rgb[0, 0], arr_rgb[0, -1], arr_rgb[-1, 0], arr_rgb[-1, -1]]
        bg_color = np.mean(corners, axis=0)
        body_mask = flood_fill_mask(arr_rgb, bg_color, tolerance=15)
        
        if np.sum(body_mask) < 100:
            return 0.0
            
        local_img = Image.open(local_path).convert("RGBA")
        if local_img.size != pipe_img.size:
            body_mask_img = Image.fromarray(body_mask.astype(np.uint8) * 255)
            body_mask_img = body_mask_img.resize(local_img.size, Image.Resampling.NEAREST)
            body_mask = np.array(body_mask_img) > 0
            
        local_arr = np.array(local_img)
        local_alpha = local_arr[:, :, 3]
        
        hollow_pixels = (body_mask) & (local_alpha < 200)
        return np.sum(hollow_pixels) / np.sum(body_mask)
    except Exception:
        return 0.0

def update_visibility_registry(file_path: Path, registry_list: list[str], pattern_match: str):
    text = file_path.read_text(encoding="utf-8")
    formatted_items = ",\n".join(f"  '{item}'" for item in sorted(registry_list))
    if file_path.suffix == ".ts":
        pattern = r"const visibilityOverrideIds = new Set\(\[\s*([\s\S]*?)\s*\]\);"
        replacement = f"const visibilityOverrideIds = new Set([\n{formatted_items},\n]);"
    else:
        pattern = r"VISIBILITY_IMAGE_OVERRIDE_IDS = \{\s*([\s\S]*?)\s*\}"
        formatted_items_py = ",\n".join(f"    \"{item}\"" for item in sorted(registry_list))
        replacement = f"VISIBILITY_IMAGE_OVERRIDE_IDS = {{\n{formatted_items_py},\n}}"
        
    new_text = re.sub(pattern, replacement, text)
    file_path.write_text(new_text, encoding="utf-8")
    print(f"Updated override registry in {file_path.name}")

def main():
    if not PIPELINE_DIR.exists():
        print(f"Error: Pipeline dir {PIPELINE_DIR} does not exist.")
        sys.exit(1)
        
    pipeline_files = list(PIPELINE_DIR.glob("*.png"))
    fish_list = load_fish_data()
    
    # We want to re-process ALL existing overrides to fix any previous leaky cutouts,
    # plus detect any new species with hollow bodies (> 8% transparent body pixels).
    existing_override_ids = {
        "sp_0062", "sp_0117", "sp_0132", "sp_0146", "sp_0148", "sp_0156", "sp_0160", "sp_0169",
        "sp_0171", "sp_0174", "sp_0207", "sp_0214", "sp_0217", "sp_0220", "sp_0223", "sp_0224",
        "sp_0226", "sp_0229", "sp_0231", "sp_0232", "sp_0233", "sp_0235", "sp_0236", "sp_0240",
        "sp_0242", "sp_0246", "sp_0252", "sp_0254", "sp_0256", "sp_0263", "sp_0264", "sp_0270",
        "sp_0271", "sp_0281", "sp_0284", "sp_0288", "sp_0294", "sp_0338", "sp_0341", "sp_0358",
        "sp_0360", "sp_0362", "sp_0375", "sp_0377", "sp_0378", "sp_0379", "sp_0380", "sp_0381",
        "sp_0382", "sp_0383", "sp_0384", "sp_0385", "sp_0389", "sp_0393", "sp_0399", "sp_0409",
        "sp_0414", "sp_0415", "sp_0418", "sp_0421", "sp_0452", "sp_0458", "sp_0459"
    }
    
    to_process = []
    
    for fish in fish_list:
        fish_id = fish["id"]
        fish_name = fish["name"]
        
        # Match pipeline file
        clean_name = fish_name.split("(")[0].strip()
        matched_file = None
        for p_file in pipeline_files:
            if clean_name in p_file.name:
                matched_file = p_file
                break
                
        if matched_file:
            override_path = OUTPUT_DIR / f"{fish_id}.png"
            local_path = override_path if override_path.exists() else ROOT / f"public/{fish['image'].split('?')[0].strip('/')}"
            
            is_hollow = False
            ratio = 0.0
            if local_path.exists():
                ratio = get_hollow_ratio(matched_file, local_path)
                # If hollow ratio > 8%
                if ratio > 0.08:
                    is_hollow = True
                    
            if is_hollow or fish_id in existing_override_ids:
                to_process.append({
                    "id": fish_id,
                    "name": fish_name,
                    "pipeline_file": matched_file,
                    "hollow_ratio": ratio,
                    "reason": "hollow_body" if is_hollow else "re_process_existing"
                })
                
    print(f"Identified {len(to_process)} species to run adaptive background removal on.")
    
    processed_ids = set(existing_override_ids)
    
    for idx, item in enumerate(to_process, 1):
        fish_id = item["id"]
        fish_name = item["name"]
        p_file = item["pipeline_file"]
        
        print(f"[{idx}/{len(to_process)}] Processing {fish_id} ({fish_name}) - Reason: {item['reason']} (ratio: {item['hollow_ratio']:.2%})")
        try:
            src_img = Image.open(p_file)
            repaired_img = remove_background_adaptively(src_img)
            
            dest_path = OUTPUT_DIR / f"{fish_id}.png"
            repaired_img.save(dest_path, optimize=True)
            print(f"    Saved restored asset to {dest_path.name}")
            processed_ids.add(fish_id)
        except Exception as e:
            print(f"    Error processing {fish_id}: {e}")
            
    # Update override registries
    processed_list = list(processed_ids)
    update_visibility_registry(SPECIES_VISUAL_TS, processed_list, "visibilityOverrideIds")
    update_visibility_registry(AUDIT_SCRIPT_PY, processed_list, "VISIBILITY_IMAGE_OVERRIDE_IDS")
    
    print("\nRestoration pipeline finished successfully!")

if __name__ == "__main__":
    main()
