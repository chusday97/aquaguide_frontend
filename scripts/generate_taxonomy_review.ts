import fs from 'node:fs';
import path from 'node:path';
import { fishData } from '../src/data/fishData';
import { getEncyclopediaLifeType, getSecondaryCategory } from '../src/modules/species/species.service';

const outputDir = path.resolve('output/classification_audit');
const csvPath = path.join(outputDir, 'species_taxonomy_review.csv');
const htmlPath = path.join(outputDir, 'species_taxonomy_review.html');

const primaryLabelByLifeType: Record<string, string> = {
  freshwaterFish: '淡水鱼',
  saltwaterFish: '海水鱼',
  invertebrate: '虾螺蟹',
  reptile: '龟/两栖',
  coral: '珊瑚/海葵',
  plant: '水草',
  hardscape: '硬景/底砂',
};

const reviewReasonFor = (oldCategory: string, primary: string, secondary: string) => {
  if ((primary === '淡水鱼' || primary === '海水鱼') && /水草|硬景|底床/.test(oldCategory)) return '旧分类把鱼放进了水草或硬景';
  if ((primary === '水草' || primary === '硬景/底砂') && /鱼类|灯科鱼|慈鲷|斗鱼|鲶鱼|异型|海水鱼/.test(oldCategory)) return '旧分类把造景素材放进了生物分类';
  if (primary === '虾螺蟹' && oldCategory === '海水鱼') return '旧分类把海水清洁生物放进了海水鱼';
  if (primary === '珊瑚/海葵' && oldCategory === '海水鱼') return '旧分类把水母/滤食生物放进了海水鱼';
  if (!secondary) return '缺少用户可见二级分类';
  return '';
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const rows = fishData.map((fish) => {
  const lifeType = getEncyclopediaLifeType(fish);
  const primary = primaryLabelByLifeType[lifeType] || '淡水鱼';
  const secondary = getSecondaryCategory(fish);
  const reviewReason = reviewReasonFor(fish.category, primary, secondary);

  return {
    id: fish.id,
    name: fish.name,
    scientificName: fish.scientificName,
    oldCategory: fish.category,
    proposedPrimaryCategory: primary,
    proposedSecondaryCategory: secondary,
    showInEncyclopedia: ['淡水鱼', '海水鱼', '虾螺蟹', '龟/两栖', '珊瑚/海葵'].includes(primary),
    showInAquariumSettings: ['水草', '硬景/底砂'].includes(primary),
    internalReviewFlag: Boolean(reviewReason),
    internalReviewReason: reviewReason,
  };
});

fs.mkdirSync(outputDir, { recursive: true });

const headers = Object.keys(rows[0] || {});
fs.writeFileSync(
  csvPath,
  `${headers.join(',')}\n${rows.map(row => headers.map(header => escapeCsv(row[header as keyof typeof row])).join(',')).join('\n')}\n`,
);

const groupedCounts = rows.reduce<Record<string, number>>((acc, row) => {
  const key = `${row.proposedPrimaryCategory} / ${row.proposedSecondaryCategory}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

fs.writeFileSync(htmlPath, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AquaGuide 物种分类审核表</title>
  <style>
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f5f7f3; color: #17251f; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 20px; }
    .pill { border: 1px solid #d7ddd7; background: white; padding: 8px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; background: white; font-size: 12px; }
    th, td { border: 1px solid #dfe5df; padding: 8px; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #173f32; color: white; z-index: 1; }
    tr.review { background: #fff7ed; }
    .muted { color: #6d766f; font-size: 13px; }
  </style>
</head>
<body>
  <h1>AquaGuide 物种分类审核表</h1>
  <p class="muted">用户可见分类只使用正式分类；内部异常只在 internalReviewFlag / internalReviewReason 中记录。</p>
  <div class="summary">
    <span class="pill">总数：${rows.length}</span>
    <span class="pill">图鉴展示：${rows.filter(row => row.showInEncyclopedia).length}</span>
    <span class="pill">鱼缸设置：${rows.filter(row => row.showInAquariumSettings).length}</span>
    <span class="pill">内部需看一眼：${rows.filter(row => row.internalReviewFlag).length}</span>
  </div>
  <div class="summary">
    ${Object.entries(groupedCounts).sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN')).map(([key, count]) => `<span class="pill">${escapeHtml(key)}：${count}</span>`).join('')}
  </div>
  <table>
    <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map(row => `<tr class="${row.internalReviewFlag ? 'review' : ''}">${headers.map(header => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
</body>
</html>
`);

console.log(`Wrote ${csvPath}`);
console.log(`Wrote ${htmlPath}`);
