import playwright from 'playwright';

const browser = await playwright.chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3003' });
const page = await context.newPage();

const readPageText = async (path) => {
  await page.goto(`http://localhost:3003${path}`, { waitUntil: 'networkidle', timeout: 15000 });
  return page.locator('body').innerText({ timeout: 5000 });
};

try {
  await page.goto('http://localhost:3003/encyclopedia', { waitUntil: 'networkidle', timeout: 15000 });
  const searchEncyclopedia = async (term) => {
    await page.getByPlaceholder('搜索鱼、虾、螺、水草或用途').fill(term);
    await page.getByRole('button', { name: '搜索' }).click();
    await page.waitForTimeout(250);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 });
    const cardNames = await page.locator('[data-species-card] h2').evaluateAll(elements => elements.map(element => element.textContent?.trim() || ''));
    const currentDisplayMatch = bodyText.match(/当前展示\s*(\d+)\s*种/);
    return {
      bodyText,
      cardNames,
      cardCount: cardNames.length,
      currentDisplayCount: currentDisplayMatch ? Number(currentDisplayMatch[1]) : null,
    };
  };

  const grassSearch = await searchEncyclopedia('草');
  const shrimpSearch = await searchEncyclopedia('虾');
  const tetraSearch = await searchEncyclopedia('灯');
  const emptySearch = await searchEncyclopedia('不存在关键词xyz');
  await page.getByPlaceholder('搜索鱼、虾、螺、水草或用途').fill('');
  await page.waitForTimeout(250);
  const clearedSearchCards = await page.locator('[data-species-card]').count();

  await page.goto('http://localhost:3003/encyclopedia', { waitUntil: 'networkidle', timeout: 15000 });
  await page.getByPlaceholder('搜索鱼、虾、螺、水草或用途').fill('公子小丑');
  await page.getByRole('button', { name: '搜索' }).click();
  const encyclopediaText = await page.locator('body').innerText({ timeout: 5000 });
  const speciesCardImageHeight = await page.locator('[data-species-card-image-area]').first().evaluate(element => element.getBoundingClientRect().height);
  await page.locator('[data-species-card-image-area]').first().click();
  const speciesDetailHeroHeight = await page.locator('[data-species-detail-hero]').evaluate(element => element.getBoundingClientRect().height);
  await page.locator('[data-species-detail-hero]').click();
  const speciesPreviewOpen = await page.getByRole('dialog', { name: /图片预览|公子小丑/ }).count().catch(() => 0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.goto('http://localhost:3003/encyclopedia', { waitUntil: 'networkidle', timeout: 15000 });
  await page.getByRole('button', { name: /混养计算/ }).click();
  await page.getByPlaceholder('搜索并加入要混养的生物').fill('红白水晶虾');
  await page.locator('button').filter({ hasText: '红白水晶虾' }).first().click();
  await page.getByPlaceholder('搜索并加入要混养的生物').fill('红剑鱼');
  await page.locator('button').filter({ hasText: '红剑鱼' }).first().click();
  await page.getByRole('button', { name: '查看调整建议' }).click();
  const adjustmentSheetOpen = (await page.locator('body').innerText({ timeout: 5000 })).includes('混养调整建议');
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  await page.getByRole('button', { name: '查看冲突详情' }).click();
  const conflictSheetOpen = (await page.locator('body').innerText({ timeout: 5000 })).includes('冲突详情');
  await page.getByRole('button', { name: '关闭弹窗' }).click();

  await page.goto('http://localhost:3003/care', { waitUntil: 'networkidle', timeout: 15000 });
  await page.getByRole('button', { name: /我的收藏/ }).click();
  const careText = await page.locator('body').innerText({ timeout: 5000 });
  await page.keyboard.press('Escape');
  const careCardImageHeight = await page.locator('[data-care-card-image]').first().evaluate(element => element.getBoundingClientRect().height);
  await page.locator('[data-care-card-image]').first().click();
  const careDetailHeroHeight = await page.locator('[data-care-detail-hero]').evaluate(element => element.getBoundingClientRect().height);
  const careDetailText = await page.locator('[role="dialog"]').last().innerText({ timeout: 5000 });
  await page.locator('[data-care-detail-hero]').click();
  const carePreviewOpen = await page.locator('[role="dialog"]').filter({ hasText: /查看大图|放大图片|关闭/ }).count().catch(() => 0);
  await page.locator('button[aria-label="关闭"], button[aria-label="关闭图片预览"]').last().click();
  await page.waitForTimeout(250);
  if (await page.getByRole('button', { name: '生成养护卡' }).count() === 0) {
    await page.locator('[data-care-card-image]').first().click();
  }
  await page.getByRole('button', { name: '生成养护卡' }).click();
  const careShareCardText = await page.locator('[data-care-share-card]').innerText({ timeout: 5000 });
  const careShareModalText = await page.locator('[role="dialog"]').last().innerText({ timeout: 5000 });
  const careShareModalHidesScrollbar = await page.locator('.aqua-care-card-modal-body').evaluate(element => getComputedStyle(element).scrollbarWidth === 'none');
  await page.getByRole('button', { name: '复制文字' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('已复制'), null, { timeout: 5000 }).catch(() => undefined);
  const careShareCopied = (await page.locator('[role="dialog"]').last().innerText({ timeout: 5000 })).includes('已复制');
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: '保存图片' }).click();
  const download = await downloadPromise;
  const careShareDownloaded = download.suggestedFilename().endsWith('.png');
  const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  const aquariumText = await readPageText('/aquarium');
  await page.getByRole('button', { name: /搭建方案|套用搭建方案|当前方案已应用/ }).first().click();
  const buildPlanText = await page.locator('body').innerText({ timeout: 5000 });

  const checks = {
    encyclopediaGrassSearchRelevant: grassSearch.cardNames.length > 0
      && grassSearch.cardNames.slice(0, 12).some(name => /草|莫斯|水榕|珍珠|牛毛|椒|宫廷|浮萍|皇冠/.test(name))
      && !grassSearch.cardNames.some(name => /极火虾|水晶虾|黑壳虾|角螺/.test(name)),
    encyclopediaSearchCountMatchesRendered: grassSearch.currentDisplayCount === grassSearch.cardCount,
    encyclopediaShrimpSearchRelevant: shrimpSearch.cardNames.some(name => name.includes('虾')),
    encyclopediaTetraSearchRelevant: tetraSearch.cardNames.some(name => /宝莲灯|红绿灯|红鼻剪刀|灯/.test(name)),
    encyclopediaEmptySearchState: emptySearch.cardCount === 0 && emptySearch.bodyText.includes('没有找到相关条目'),
    encyclopediaClearSearchRestoresList: clearedSearchCards > 0,
    encyclopediaHasMarineBadge: encyclopediaText.includes('海缸'),
    speciesCardImageLarge: speciesCardImageHeight >= 150,
    speciesDetailHeroLarge: speciesDetailHeroHeight >= 220,
    speciesPreviewOpen: speciesPreviewOpen > 0,
    compatibilityAdjustmentSheet: adjustmentSheetOpen,
    compatibilityConflictSheet: conflictSheetOpen,
    careFavoritesDialog: careText.includes('我的收藏') && (careText.includes('还没有收藏') || careText.includes('已收藏')),
    careCardImageLarge: careCardImageHeight >= 112,
    careDetailHeroLarge: careDetailHeroHeight >= 240,
    careGuideStructure: careDetailText.includes('核心结论') && careDetailText.includes('今日建议') && careDetailText.includes('暂时避免') && careDetailText.includes('异常情况处理'),
    careGuideRemovedWhyBlock: !careDetailText.includes('为什么？') && !careDetailText.includes('先不要做'),
    careShareCardStructure: careShareCardText.includes('AquaGuide 养护卡') && careShareCardText.includes('核心结论') && careShareCardText.includes('先做') && careShareCardText.includes('暂时避免') && careShareCardText.includes('异常提醒'),
    careShareCardNoVagueActions: !/避开风险|查过滤|注意观察|及时处理/.test(careShareCardText),
    careShareModalRenamed: careShareModalText.includes('生成养护卡') && !careShareModalText.includes('生成处理卡'),
    careShareModalHidesScrollbar,
    careShareCopied,
    careShareDownloaded,
    carePreviewOpen: carePreviewOpen > 0,
    noHorizontalScroll,
    aquariumRemovedContentHint: !aquariumText.includes('这里展示当前鱼缸里已经添加或配置的内容'),
    buildPlanUsesAdaptedPlan: buildPlanText.includes('当前鱼缸适配结果') && buildPlanText.includes('应用调整后的安全方案') || buildPlanText.includes('应用到当前鱼缸') || buildPlanText.includes('当前鱼缸偏小'),
    buildPlanHasCapacityStatus: /适合当前鱼缸|可用，已缩减生物|不适合当前鱼缸/.test(buildPlanText),
  };

  console.log(JSON.stringify(checks, null, 2));

  if (Object.values(checks).some(value => !value)) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
