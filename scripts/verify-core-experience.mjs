import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.AQUAGUIDE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

const seededState = {
  version: 1,
  currentAquariumId: 'tank-e2e',
  aquariums: [{
    id: 'tank-e2e',
    name: '验收鱼缸',
    fishes: [{ id: 'fish-e2e', fishId: 'sp_0001', quantity: 6, entryDate: '2026-07-01', lastWaterChangeDate: '2026-07-10' }],
    dimensions: { length: '60', width: '35', height: '40' },
    waterType: 'Freshwater',
    targetTemperature: '25',
    equipment: { filter: '瀑布过滤', heater: true, oxygen: true, light: '普通灯' },
  }],
  wishlist: ['sp_0001'],
  dismissedRecommendations: [],
  diagnosisRecords: [],
  compatibilityRecords: [],
  deceasedRecords: [],
  feedingRecords: [],
  observationRecords: [],
  riskReminderState: {},
  updatedAt: new Date().toISOString(),
};

const seedStorage = async (context) => {
  await context.addInitScript((state) => {
    localStorage.setItem('aquarium_app_state_v1', JSON.stringify(state));
    localStorage.setItem('aquariums', JSON.stringify(state.aquariums));
    localStorage.setItem('wishlistFishIds', JSON.stringify(['sp_0001']));
    localStorage.setItem('aqua_care_favorites', JSON.stringify({
      guide_water_deteriorate: { id: 'guide_water_deteriorate', title: '水质变差怎么办', favoritedAt: new Date().toISOString() },
    }));
  }, seededState);
};

const layoutCases = [
  ['desktop-narrow', { viewport: { width: 600, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130 Safari/537.36' }, 'desktop', 1, 0],
  ['iphone', { viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1' }, 'phone', 0, 1],
  ['ipad', { viewport: { width: 820, height: 1180 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1' }, 'desktop', 1, 0],
];

try {
  for (const [name, options, expectedMode, sidebarCount, bottomCount] of layoutCases) {
    const context = await browser.newContext(options);
    await seedStorage(context);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('.aquaguide-app');
    assert.equal(await page.locator('.aquaguide-app').getAttribute('data-layout-mode'), expectedMode, name);
    assert.equal(await page.locator('.desktop-sidebar').count(), sidebarCount, `${name} sidebar`);
    assert.equal(await page.locator('nav.fixed.inset-x-0.bottom-0').count(), bottomCount, `${name} bottom nav`);
    if (name === 'iphone') {
      await page.goto(`${baseUrl}/collection?tab=wishlist`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForFunction(() => location.pathname === '/collection/wishlist');
      await page.getByRole('heading', { name: '种草图鉴', exact: true }).waitFor();
      await page.locator('#collection-wishlist-sp_0001 button').first().click();
      const phoneDetail = page.locator('[role="dialog"][data-surface="bottom-sheet"]:visible');
      await phoneDetail.waitFor();
      assert.equal(await phoneDetail.getAttribute('data-surface'), 'bottom-sheet');
      await phoneDetail.getByRole('button', { name: '返回' }).click();
    }
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedStorage(context);
  await context.addInitScript(() => sessionStorage.setItem('aquaguide_compatibility_selection', JSON.stringify(['sp_0001', 'sp_0002'])));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(`${baseUrl}/wishlist`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => location.pathname === '/collection/wishlist');
  await page.getByRole('heading', { name: '种草图鉴', exact: true }).waitFor();
  const wishlistText = await page.locator('body').innerText();
  assert.match(wishlistText, /自然水族册/);
  assert.match(wishlistText, /种草图鉴/);
  assert.doesNotMatch(wishlistText, /搜索鱼、虾|今日种草/);
  await page.locator('#collection-wishlist-sp_0001 button').first().click();
  const speciesDialog = page.getByRole('dialog');
  await speciesDialog.getByText('极火虾', { exact: true }).first().waitFor();
  assert.equal(await speciesDialog.getAttribute('data-surface'), 'centered-dialog');
  await speciesDialog.getByRole('button', { name: '返回' }).click();
  await speciesDialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.getElementById('collection-wishlist-sp_0001')?.classList.contains('workspace-section-highlight'));
  assert.equal(await page.locator('#collection-wishlist-sp_0001').evaluate(element => element === document.activeElement || element.contains(document.activeElement)), true);
  assert.equal(await page.locator('#collection-wishlist-sp_0001').evaluate(element => element.classList.contains('workspace-section-highlight')), true);

  await page.goto(`${baseUrl}/care-favorites`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => location.pathname === '/collection/care');
  await page.getByRole('heading', { name: '养护收藏', exact: true }).waitFor();
  const careFavoritesText = await page.locator('body').innerText();
  assert.match(careFavoritesText, /自然水族册/);
  assert.match(careFavoritesText, /养护收藏/);
  assert.doesNotMatch(careFavoritesText, /为当前鱼缸推荐|按问题快速查找/);
  await page.locator('#collection-care-guide_water_deteriorate button').first().click();
  await page.getByText('水质变差怎么办', { exact: true }).last().waitFor();
  const careDialog = page.locator('[role="dialog"][data-surface="centered-dialog"]:visible');
  assert.equal(await careDialog.getAttribute('data-surface'), 'centered-dialog');
  await careDialog.getByRole('button', { name: '关闭' }).click();
  await careDialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.getElementById('collection-care-guide_water_deteriorate')?.classList.contains('workspace-section-highlight'));
  assert.equal(await page.locator('#collection-care-guide_water_deteriorate').evaluate(element => element === document.activeElement || element.contains(document.activeElement)), true);
  assert.equal(await page.locator('#collection-care-guide_water_deteriorate').evaluate(element => element.classList.contains('workspace-section-highlight')), true);

  await page.goto(`${baseUrl}/collection/achievements`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => location.pathname === '/collection/achievements');
  await page.getByText('勋章会自动解锁，无需领取', { exact: true }).waitFor();
  await page.getByText('初心缸主', { exact: true }).waitFor();
  assert.ok(await page.locator('[data-achievement-status="unlocked"]').count() > 0);
  assert.ok(await page.locator('[data-achievement-status="locked"], [data-achievement-status="in_progress"]').count() > 0);
  assert.match(await page.locator('[data-achievement-status]').first().innerText(), /当前 \d+.*目标 \d+/s);

  await page.goto(`${baseUrl}/encyclopedia`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByText('Mini 混养判断', { exact: true }).waitFor();
  await page.getByRole('button', { name: '查看详细判断' }).click();
  await page.getByText(/已选生物 2 种/).waitFor();

  await page.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.getByRole('button', { name: /AI 建缸助手/ }).click();
  const assistantDialog = page.getByRole('dialog', { name: 'AI 建缸助手' });
  await assistantDialog.waitFor();
  assert.equal(await assistantDialog.getAttribute('data-surface'), 'task-flow');
  await assistantDialog.getByRole('button', { name: '关闭' }).click();
  await page.getByRole('button', { name: /每日鱼缸检查/ }).click();
  const dialog = page.getByRole('dialog', { name: '每日鱼缸检查' });
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute('data-surface'), 'task-flow');
  for (const answer of ['正常', '清澈', '没有泡沫或油膜', '没有异味', '正常游动和进食', '没有特别操作']) {
    await dialog.getByRole('button', { name: answer, exact: true }).click();
  }
  await dialog.getByRole('button', { name: '生成检查结果', exact: true }).click();
  await dialog.getByText('结构化诊断结果').waitFor();
  await dialog.getByRole('button', { name: '保存今天记录' }).click();
  await dialog.getByText(/已保存今天的检查记录/).waitFor();
  await page.waitForTimeout(900);
  const patrolCount = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('aquarium_app_state_v1') || '{}');
    return (state.diagnosisRecords || []).filter((record) => record.problemType === '巡检' && record.aquariumId === 'tank-e2e').length;
  });
  assert.equal(patrolCount, 1);
  await context.close();

  console.log('core experience: layout, collection, adaptive details, mini compatibility, daily check passed');
} finally {
  await browser.close();
}
