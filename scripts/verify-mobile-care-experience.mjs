import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.AQUAGUIDE_URL || 'http://127.0.0.1:3000';
const phoneUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const browser = await chromium.launch({ headless: true });

const seededState = {
  version: 1,
  currentAquariumId: 'tank-mobile-e2e',
  aquariums: [{
    id: 'tank-mobile-e2e',
    name: '手机验收鱼缸',
    fishes: [{ id: 'fish-mobile-e2e', fishId: 'sp_0001', quantity: 6, entryDate: '2026-07-01' }],
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
    localStorage.setItem('wishlistFishIds', JSON.stringify(state.wishlist));
  }, seededState);
};

try {
  for (const width of [320, 375, 390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, userAgent: phoneUserAgent });
    await seedStorage(context);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${baseUrl}/encyclopedia`, { waitUntil: 'domcontentloaded' });
    const pager = page.locator('#atlas-pagination-bottom > div:visible');
    await pager.waitFor();
    const buttonY = await pager.locator('button').evaluateAll(buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)));
    assert.equal(new Set(buttonY).size, 1, `${width}px pager stays on one row`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, `${width}px has no horizontal overflow`);
    await pager.getByRole('button', { name: '下一组图鉴' }).click();
    await pager.getByText(/^2 \/ /).waitFor();
    await pager.getByRole('button', { name: '图鉴尾页' }).click();
    assert.equal(await pager.getByRole('button', { name: '图鉴尾页' }).isDisabled(), true);
    await pager.getByRole('button', { name: '图鉴首页' }).click();
    assert.equal(await pager.getByRole('button', { name: '图鉴首页' }).isDisabled(), true);
    await context.close();
  }

  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: phoneUserAgent });
  await seedStorage(phoneContext);
  const phonePage = await phoneContext.newPage();
  phonePage.setDefaultTimeout(20000);
  await phonePage.goto(`${baseUrl}/care`, { waitUntil: 'domcontentloaded' });
  const recommendation = phonePage.locator('[data-care-recommend-card]').first();
  await recommendation.waitFor();
  const recommendationCounter = phonePage.locator('#care-recommendations').getByText(/^[0-9]+\/[0-9]+$/);
  const counterBefore = await recommendationCounter.innerText();
  await phonePage.waitForTimeout(4500);
  assert.equal(await recommendationCounter.innerText(), counterBefore, 'care recommendation does not auto rotate');
  assert.equal(await recommendation.evaluate(element => element.parentElement?.scrollLeft || 0), 0, 'recommendation does not reveal adjacent cards');
  assert.equal(await phonePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'care page has no horizontal overflow');
  await phonePage.getByRole('button', { name: /水族册养护/ }).click();
  await phonePage.waitForFunction(() => location.pathname === '/collection/care');
  await phonePage.getByRole('heading', { name: '养护收藏', exact: true }).waitFor();

  await phonePage.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
  await phonePage.getByRole('button', { name: /缸内物种/ }).last().waitFor();
  await phonePage.getByRole('button', { name: /缸内物种/ }).last().click();
  await phonePage.getByRole('button', { name: /缸内物种与配置/ }).waitFor();
  await phonePage.getByRole('button', { name: '全屏预览' }).click();
  const tankPreview = phonePage.getByRole('dialog', { name: '鱼缸全屏预览' });
  await tankPreview.waitFor();
  await tankPreview.getByRole('button', { name: /极火虾.*6 只\/条/ }).waitFor();
  await phoneContext.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedStorage(desktopContext);
  const desktopPage = await desktopContext.newPage();
  desktopPage.setDefaultTimeout(20000);
  await desktopPage.goto(`${baseUrl}/care?topic=guide_new_fish_acclimation`, { waitUntil: 'domcontentloaded' });
  await desktopPage.getByRole('button', { name: '设置 3 天观察提醒' }).waitFor();
  await desktopPage.getByRole('button', { name: '设置 3 天观察提醒' }).click();
  await desktopPage.getByRole('button', { name: '3 天后确认是否稳定' }).click();
  await desktopPage.getByRole('button', { name: '确认设置' }).click();
  const reminder = await desktopPage.evaluate(() => JSON.parse(localStorage.getItem('aqua_care_reminders') || '[]')[0]);
  assert.equal(reminder.sourceTopicId, 'guide_new_fish_acclimation');
  assert.equal(reminder.aquariumId, 'tank-mobile-e2e');
  assert.ok(!Number.isNaN(new Date(reminder.scheduledFor).getTime()));

  await desktopPage.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
  await desktopPage.getByRole('button', { name: /新建鱼缸/ }).waitFor();
  await desktopPage.getByRole('button', { name: '缸内物种 1', exact: true }).waitFor();
  await desktopPage.getByText('养护计划', { exact: true }).waitFor();
  await desktopPage.getByText('如何安全给新鱼过水？', { exact: true }).waitFor();
  assert.equal(await desktopPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'desktop aquarium has no horizontal overflow');
  await desktopContext.close();

  console.log('mobile care experience: pager, recommendations, collection, tank species and care plan passed');
} finally {
  await browser.close();
}
