# AquaGuide Species Image Quality Standard

## Goal

All species images used in the app should look like app-native cutout assets:

- Transparent background.
- Complete subject silhouette.
- No clipped fins, tails, legs, antennae, leaves, or tentacles.
- No visible white crop border.
- Enough transparent padding for cards, galleries, 3D preview overlays, and saved images.

## App-Ready Image Rules

1. File format
   - Use PNG with alpha transparency for app display assets.
   - Avoid JPG/WebP for primary cutout assets unless they are only used as source references.

2. Background
   - Background must be transparent.
   - White or gray backgrounds are not acceptable for app display images.
   - Edge-connected white background may be removed, but white body parts must be preserved.

3. Subject completeness
   - Fish: preserve full tail, dorsal fin, anal fin, ventral fin, whiskers, and transparent fin edges.
   - Shrimp/crab/snail: preserve antennae, legs, shell edges, and tail fan.
   - Turtle/amphibian: preserve head, limbs, tail, shell outline, and toes.
   - Plants/coral/anemone: preserve outer leaf/frond/tentacle shape, even if thin or pale.

4. Safe padding
   - Keep at least 12%-18% transparent padding around the subject after cutout.
   - Minimum pixel margin should usually be 32 px or more.
   - Do not crop the canvas tightly to the subject.

5. Scale and placement
   - Subject should be centered visually, not mathematically.
   - Long fish can use wider canvas.
   - Tall plants can use taller canvas.
   - Do not stretch subject proportions.

6. Frontend rendering
   - Use `object-contain` for species images.
   - Avoid relying on `overflow-hidden` to hide bad crop edges.
   - Display containers can crop their own corners, but source images must still include safe padding.

## Audit Flags

Images should enter the rework queue when any of these are detected:

- `missing_file`: referenced image does not exist.
- `empty_cutout`: alpha mask has almost no foreground.
- `tiny_subject`: subject is too small or heavily removed.
- `fragmented_subject`: subject is split into pieces, often caused by aggressive background removal.
- `edge_touch`: subject touches the image edge.
- `low_edge_margin`: transparent margin is too small.
- `semantic_mismatch`: image does not match the species.
- `temporary_placeholder`: image is known to be a placeholder.

## Current Audit Command

Run from the project root:

```bash
python3 scripts/audit_species_images.py
```

Outputs:

- `output/image_quality/species_image_quality_audit.csv`
- `output/image_quality/species_image_quality_audit.html`
- `output/image_quality/species_image_rework_queue.csv`

## Current Audit Snapshot

Last checked: 2026-06-01

- Total audited images: 486
- Passed as crop-safe: 466
- Needs review: 10
- External images skipped from pixel audit: 10
- Rework candidates: 12
- High priority: 2

High-priority rework items:

- `sp_0141` 甜心柠檬灯: semantic mismatch. Replace with a correct realistic lemon tetra / sweet lemon tetra cutout.
- `sp_0459` 黑壳虾: temporary placeholder. Replace with a realistic wild-type dark brown/black Neocaridina davidi cutout.

Medium-priority crop or fragmentation review items:

- `sp_0070` 蝴蝶鲤
- `sp_0151` 彩色天使鱼（彩色裙鱼）
- `sp_0156` 白金蓝曼龙
- `sp_0169` 银玛丽
- `sp_0174` 红眼白子红裙
- `sp_0207` 白金黑裙
- `sp_0288` 白金黑裙鱼 (长鳍)
- `sp_0384` 天草水母
- `sp_0389` 白金半月斗鱼
- `sp_0452` 公子小丑

## Repair Policy

Do not bulk overwrite all image assets automatically.

Recommended order:

1. Fix semantic mismatches and placeholders first.
2. Review fragmented/tiny subjects by contact sheet.
3. Regenerate or source correct images when the original subject has already been cropped away.
4. Only use automatic padding repair when the subject is complete but too close to the canvas edge.
5. Re-run the audit after every batch.

