import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.AQUAGUIDE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

const seedStorage = async (context) => {
  await context.addInitScript(() => {
    const state = {
      version: 1,
      currentAquariumId: 'wishlist-shortcut-tank',
      aquariums: [{
        id: 'wishlist-shortcut-tank',
        name: '收藏验收鱼缸',
        fishes: [],
        dimensions: { length: '60', width: '35', height: '40' },
        waterType: 'Freshwater',
        targetTemperature: '25',
        equipment: { filter: '瀑布过滤', heater: true, oxygen: true, light: '普通灯' },
      }],
      wishlist: [],
      diagnosisRecords: [],
      deceasedRecords: [],
      feedingRecords: [],
      observationRecords: [],
      compatibilityRecords: [],
      dismissedRecommendations: [],
      riskReminderState: {},
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('aquarium_app_state_v1', JSON.stringify(state));
    localStorage.setItem('aquariums', JSON.stringify(state.aquariums));
    localStorage.setItem('wishlistFishIds', '[]');
  });
};

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const isPhone = viewport.width < 768;
    const context = await browser.newContext({
      viewport,
      ...(isPhone ? {
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      } : {}),
    });
    await seedStorage(context);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${baseUrl}/encyclopedia`, { waitUntil: 'domcontentloaded' });

    const card = page.locator('[data-species-card]').first();
    await card.waitFor();
    const speciesName = (await card.locator('h2').innerText()).trim();
    const favoriteButton = card.getByRole('button', { name: `收藏${speciesName}` });
    await favoriteButton.click();
    assert.equal(await favoriteButton.getAttribute('aria-pressed'), 'true', `${viewport.width}px favorite state`);
    await page.getByText(`已收录到水族册：${speciesName}`, { exact: true }).waitFor();

    const favoriteBox = await favoriteButton.boundingBox();
    const imageBox = await card.locator('[data-species-card-image-area]').boundingBox();
    assert.ok(favoriteBox && imageBox, 'favorite and image boxes exist');
    assert.ok(favoriteBox.x >= imageBox.x && favoriteBox.y >= imageBox.y, 'favorite button stays in image top-left');
    assert.ok(favoriteBox.width >= 40 && favoriteBox.height >= 40, 'favorite touch target is at least 40px');

    await page.getByRole('button', { name: '查看水族册', exact: true }).click();
    await page.waitForFunction(() => location.pathname === '/collection/wishlist');
    await page.getByText(speciesName, { exact: true }).first().waitFor();
    await context.close();
  }

  const groupContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedStorage(groupContext);
  const groupPage = await groupContext.newPage();
  groupPage.setDefaultTimeout(20000);
  await groupPage.goto(`${baseUrl}/encyclopedia`, { waitUntil: 'domcontentloaded' });
  const groupCard = groupPage.locator('[data-species-group-card]').first();
  await groupCard.waitFor();
  await groupCard.getByRole('button', { name: /选择.*具体变种收藏/ }).click();
  const dialog = groupPage.getByRole('dialog');
  await dialog.waitFor();
  const variantFavorites = dialog.locator('button[id^="group-variant-wishlist-"]');
  assert.ok(await variantFavorites.count() > 1, 'group dialog exposes per-variant favorite buttons');
  assert.match(await groupPage.evaluate(() => document.activeElement?.id || ''), /^group-variant-wishlist-/, 'group favorite entry focuses variant favorite control');
  const firstVariantFavorite = variantFavorites.first();
  await firstVariantFavorite.click();
  assert.equal(await firstVariantFavorite.getAttribute('aria-pressed'), 'true', 'variant favorite toggles independently');
  await groupContext.close();

  console.log('wishlist shortcut: desktop, phone, collection sync and group variants passed');
} finally {
  await browser.close();
}
