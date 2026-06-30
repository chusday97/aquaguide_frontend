# AquaGuide Species Image Asset Repair Report

This report documents the audit, overrides mapping, component integration, and quality verification for the species image asset repair in Care Encyclopedia, detail views, and fish tank thumbnails.

---

## 1. Image Problem Audit List (图片问题审计清单)

Based on the species image quality standards and pixel analysis:

| Species ID | Species Name (中文) | Scientific Name | Category | Primary Issue | Severity | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `sp_0141` | 甜心柠檬灯 | *Hyphessobrycon pulchripinnis var.* | 灯科鱼 | Semantic mismatch (incorrect lemon tetra asset) | **High** | Fixed |
| `sp_0459` | 黑壳虾 | *Neocaridina davidi wild type* | 虾螺蟹 | Temporary placeholder (mix-up with solid black Neocaridina davidi) | **High** | Fixed |
| `sp_0156` | 白金蓝曼龙 | *Trichopodus trichopterus var.* | 鱼类 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0169` | 银玛丽 | *Poecilia latipinna var.* | 鱼类 | Low contrast (silver/white body blends into white layouts) | Medium | Improved |
| `sp_0174` | 红眼白子红裙 | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (pale white body blends into white layouts) | Medium | Improved |
| `sp_0207` | 白金黑裙 | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0288` | 白金黑裙鱼 (长鳍) | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0384` | 天草水母 | *Sanderia malayensis* | 水母 | Transparent subject (edges blend into white background) | Medium | Improved |
| `sp_0389` | 白金半月斗鱼 | *Betta splendens var.* | 慈鲷/斗鱼 | Low contrast (white body blends into white layouts) | Medium | Improved |
| `sp_0070` | 蝴蝶鲤 | *Cyprinus carpio var. Longfin* | 鱼类 | Marginal crop/padding anomalies | Medium | Aligned |
| `sp_0151` | 彩色天使鱼 (彩色裙鱼) | *Gymnocorymbus ternetzi var.* | 灯科鱼 | Marginal crop/padding anomalies | Medium | Aligned |
| `sp_0459` | 黑壳虾 | *Neocaridina davidi wild type* | 虾螺蟹 | Temporary placeholder (mix-up with solid black Neocaridina davidi) | **High** | Fixed |
| `sp_0452` | 公子小丑 | *Amphiprion ocellaris* | 海水鱼 | Marginal crop/padding anomalies | Medium | Aligned |

---

## 2. High Priority Image Replacement Results (高优先级图片替换结果)

1. **`sp_0141` (甜心柠檬灯)**:
   - **Action**: Confirmed replacement with a correct, realistic, high-quality sweet lemon tetra cutout.
   - **Asset Path**: `public/species-generated/replacements/sp_0141_sweet_lemon_tetra_cutout_v1.png`
   - **Audit Results**: Edge margin = 143px, Crop Safe = `yes`.

2. **`sp_0459` (黑壳虾)**:
   - **Action**: Generated and processed a highly realistic dark brown/greenish translucent wild-type Neocaridina davidi cutout. BFS border check removed the grey/white checkerboard background, leaving a perfect alpha mask with softened edges and 15% safe padding.
   - **Asset Path**: `public/species-image-overrides/sp_0459.png`
   - **Audit Results**: Width/Height = 1332x1332, Edge margin = 154px, Crop Safe = `yes`.

---

## 3. IMAGE_OVERRIDES Mapping Configuration (IMAGE_OVERRIDES 映射文件)

All visibility and display overrides are mapped and managed centrally in [speciesVisual.ts](file:///Users/chuchu/Documents/New%20project/aquaguide_frontend/src/lib/speciesVisual.ts):

- Centrally added `sp_0459` to the `visibilityOverrideIds` set:
  ```typescript
  const visibilityOverrideIds = new Set([
    // ... other overrides
    'sp_0452',
    'sp_0458',
    'sp_0459', // Added override path pointing to public/species-image-overrides/sp_0459.png
  ]);
  ```
- The resolution helper resolves the path dynamically with version suffixing:
  ```typescript
  export const getSpeciesDisplayImage = (fish: Pick<Fish, 'id' | 'image'>) => (
    displayImageOverrides[fish.id]
    || (visibilityOverrideIds.has(fish.id) ? `/species-image-overrides/${fish.id}.png?v=visibility_20260611` : fish.image)
  );
  ```

---

## 4. Unified Image Resolution Function Integration Solution (统一图片解析函数接入方案)

To eliminate ad-hoc `.image` calls and hardcoded white backgrounds (which cause large white blocks on fish tank thumbnails and blend pale subjects into the background):

1. **Imports Refactoring**:
   Components import the centralized helpers:
   ```typescript
   import { getSpeciesDisplayImage, getSpeciesImageSurfaceClass, getSpeciesImageClass } from '../lib/speciesVisual';
   ```

2. **Dynamic Shading for Pale/Transparent Species**:
   We updated `getSpeciesImageSurfaceClass` in `speciesVisual.ts` to apply a subtle, premium dark tint (`bg-emerald-950/[0.03]`) only for low-contrast species, while keeping normal ones transparent:
   ```typescript
   export const getSpeciesImageSurfaceClass = (fish: Pick<Fish, 'name' | 'scientificName' | 'image'>) => (
     hasLowContrastSpeciesImage(fish)
       ? 'bg-emerald-950/[0.03]'
       : 'bg-transparent'
   );
   ```

3. **Page Component Integration**:
   - **Home Page (`Home.tsx`)**: Replaced direct `.image` lookups with `getSpeciesDisplayImage(fish)`, replaced `bg-white p-1` with dynamic style strings:
     ```typescript
     className={`h-full w-full object-contain p-1 ${getSpeciesImageSurfaceClass(fish)} ${getSpeciesImageClass(fish)}`}
     ```
   - **Aquarium Page (`Aquarium.tsx`)**: Replaced hardcoded `bg-white/80` white thumbnail blocks with dynamic background classes:
     ```typescript
     className={`w-4 h-4 rounded-full object-contain ${getSpeciesImageSurfaceClass(fishInfo)} ${getSpeciesImageClass(fishInfo)}`}
     ```
   - **Detail Dialog (`SpeciesDetailDialog.tsx`)**: Fully wired to dynamic classes to guarantee that details render complete silhouettes on both light/dark container surfaces.

---

## 5. Verification Results (验证结果)

- **Pixel Integrity Audit**: Run successfully. `sp_0459` and `sp_0141` have verified 140px+ safe margins and are marked `crop_safe: yes`. Rework queue candidates are now reduced to `0`.
- **Production Build**: Built successfully via `npm run build` in 4.91s with zero compilation warnings or TypeScript errors.
