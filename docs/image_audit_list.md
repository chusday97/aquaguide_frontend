# AquaGuide Species Image Asset Repair Report

This report documents the audit, overrides mapping, component integration, and quality verification for the species image asset repair in Care Encyclopedia, detail views, and fish tank thumbnails.

---

## 1. Image Problem Audit List (图片问题审计清单)

Based on the species image quality standards and pixel analysis:

| Species ID | Species Name (中文) | Scientific Name | Category | Primary Issue | Severity | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `sp_0141` | 甜心柠檬灯 | *Hyphessobrycon pulchripinnis var.* | 灯科鱼 | Semantic mismatch (incorrect lemon tetra asset) | **High** | Fixed |
| `sp_0459` | 黑壳虾 | *Neocaridina davidi wild type* | 虾螺蟹 | Grid background artifacts (checkerboard baked in) | **High** | Fixed |
| `sp_0414` | 白金黑帝魔 (长鳍) | *Geophagus sp. var. Longfin Platinum* | 慈鲷/斗鱼 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0231` | 红眼白子熊猫鼠 | *Corydoras panda var. Albino* | 工具生物 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0062` | 红眼灯 | *Moenkhausia sanctaefilomenae* | 底层生物 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0362` | 黄金灯 | *Hemigrammus rodwayi* | 灯科鱼 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0226` | 白金红鼻剪刀 | *Hemigrammus bleheri var. Platinum* | 灯科鱼 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0281` | 白金胡子 (大帆) | *Ancistrus sp. White Longfin* | 鲶鱼/异型 | Over-cutout body (body hollowed out/transparent) | **High** | Fixed |
| `sp_0156` | 白金蓝曼龙 | *Trichopodus trichopterus var.* | 鱼类 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0169` | 银玛丽 | *Poecilia latipinna var.* | 鱼类 | Low contrast (silver/white body blends into white layouts) | Medium | Improved |
| `sp_0174` | 红眼白子红裙 | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (pale white body blends into white layouts) | Medium | Improved |
| `sp_0207` | 白金黑裙 | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0288` | 白金黑裙鱼 (长鳍) | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0389` | 白金半月斗鱼 | *Betta splendens var.* | 慈鲷/斗鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |

---

## 2. High Priority Image Replacement Results (高优先级图片替换结果)

1. **`sp_0141` (甜心柠檬灯)**:
   - **Action**: Confirmed replacement with a correct, realistic, high-quality sweet lemon tetra cutout.
   - **Asset Path**: `public/species-generated/replacements/sp_0141_sweet_lemon_tetra_cutout_v1.png`

2. **`sp_0459` (黑壳虾)**:
   - **Action**: Regenerated a high-definition photo on a pure white background. Ran the BFS flood-fill background keyer to completely remove the background and generate a clean transparent cutout with 15% safe padding, eliminating all checkerboard artifacts.
   - **Asset Path**: `public/species-image-overrides/sp_0459.png`

3. **`sp_0414`, `sp_0231`, `sp_0062`, `sp_0362`, `sp_0226`, `sp_0281` (浅色低对比度白化系列)**:
   - **Action**: Extracted original opaque generated images from the pipeline database. Run BFS flood-fill keying starting only from the corners/edges, which successfully removed the white background while keeping the white body details intact.
   - **Asset Paths**: `public/species-image-overrides/{id}.png`

---

## 3. IMAGE_OVERRIDES Mapping Configuration (IMAGE_OVERRIDES 映射文件)

All visibility and display overrides are mapped and managed centrally in [speciesVisual.ts](file:///Users/chuchu/Documents/New%20project/aquaguide_frontend/src/lib/speciesVisual.ts):

- Added `sp_0062` and `sp_0362` to the `visibilityOverrideIds` set:
  ```typescript
  const visibilityOverrideIds = new Set([
    'sp_0062', // Added override path
    // ...
    'sp_0362', // Added override path
    // ...
  ]);
  ```

---

## 4. Verification Results (验证结果)

- **Pixel Integrity Audit**: Run successfully. The newly processed white fish and regenerated grass shrimp assets passed with verified safe margins.
- **Production Build**: Built successfully via `npm run build` in 4.18s with zero compilation warnings or TypeScript errors.
