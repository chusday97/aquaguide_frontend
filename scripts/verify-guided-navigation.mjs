import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });

const baseState = ({ withTank = false } = {}) => ({
  version: 1,
  currentAquariumId: withTank ? 'tank-1' : '',
  aquariums: withTank ? [{
    id: 'tank-1',
    name: '测试鱼缸',
    fishes: [{ fishId: 'sp_0001', quantity: 4, entryDate: '2026-07-20T00:00:00.000Z' }],
    lastWaterChangeDate: '2026-07-20T00:00:00.000Z',
    dimensions: { length: '60', width: '40', height: '40' },
    waterType: 'Freshwater',
    targetTemperature: '25',
    substrate: '无',
    plants: [],
    hardscape: [],
    equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
  }] : [],
  wishlist: [],
  dismissedRecommendations: [],
  diagnosisRecords: [],
  compatibilityRecords: [],
  deceasedRecords: [],
  feedingRecords: [],
  observationRecords: [],
  riskReminderState: {},
  onboarding: { version: 1, status: 'completed', viewedSpecies: true, taskCardDismissed: false },
  updatedAt: new Date().toISOString(),
});

const seed = async (page, state, locale = 'zh-CN') => {
  await page.addInitScript(({ state: saved, locale: language }) => {
    localStorage.setItem('aquarium_app_state_v1', JSON.stringify(saved));
    localStorage.setItem('aquaguide_locale', language);
  }, { state, locale });
};

try {
  const fresh = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', isMobile: true, hasTouch: true });
  fresh.setDefaultTimeout(8_000);
  await fresh.goto(`${baseUrl}/aquarium`, { waitUntil: 'networkidle' });
  await fresh.waitForURL('**/welcome');
  await fresh.getByRole('button', { name: '开始' }).first().click();
  await fresh.waitForURL('**/aquarium?action=create&source=onboarding');
  await fresh.getByRole('dialog').waitFor();
  assert.ok(await fresh.getByRole('dialog').isVisible(), 'build-tank onboarding must open the actual creation task');
  console.log('PASS onboarding opens the real tank task');
  await fresh.close();

  const desktop = await browser.newPage({ viewport: { width: 1200, height: 900 }, locale: 'zh-CN' });
  desktop.setDefaultTimeout(8_000);
  await seed(desktop, baseState({ withTank: true }));
  const desktopErrors = [];
  desktop.on('pageerror', error => desktopErrors.push(error.message));
  await desktop.goto(`${baseUrl}/aquarium`, { waitUntil: 'networkidle' });
  const sidebarSearch = desktop.getByLabel('输入中文名、英文名、学名或养护问题').first();
  await sidebarSearch.fill('极火虾');
  await sidebarSearch.press('Enter');
  await desktop.waitForURL('**/search?q=*');
  await desktop.getByRole('heading', { name: '物种' }).waitFor();
  await desktop.getByRole('button', { name: '拍照识别' }).first().click();
  await desktop.waitForURL('**/identify');
  await desktop.goBack();
  await desktop.getByRole('button', { name: '设置' }).last().click();
  await desktop.waitForURL('**/settings');
  assert.deepEqual(desktopErrors, []);
  console.log('PASS sidebar search, photo identification, and settings use routes');

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  phone.setDefaultTimeout(8_000);
  await seed(phone, baseState({ withTank: true }));
  const phoneErrors = [];
  phone.on('pageerror', error => phoneErrors.push(error.message));
  await phone.goto(`${baseUrl}/aquarium`, { waitUntil: 'networkidle' });
  await phone.getByText('缸内物种', { exact: true }).last().click();
  await phone.getByRole('button', { name: '调整体态' }).click();
  await phone.getByLabel('数量').fill('3');
  await phone.getByLabel('生长阶段').selectOption('adult');
  await phone.getByLabel('繁殖状态').selectOption('normal');
  await phone.getByRole('button', { name: '拆分' }).click();
  await phone.getByLabel('拆出数量').fill('1');
  await phone.getByLabel('繁殖状态').last().selectOption('pregnant_or_gravid');
  await phone.getByRole('button', { name: '确认拆分' }).click();
  await phone.getByRole('button', { name: '保存修改' }).click();
  await phone.getByText(/共 3 条\/只 · 成年 3 · 怀孕 1/).waitFor();
  const stored = await phone.evaluate(() => JSON.parse(localStorage.getItem('aquarium_app_state_v1')).aquariums[0].fishes[0]);
  assert.equal(stored.quantity, 3);
  assert.equal(stored.batches.length, 2);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390px batch manager must not overflow');
  assert.deepEqual(phoneErrors, []);
  console.log('PASS mobile livestock split persists without overflow');
  await phone.close();

  const narrowEnglish = await browser.newPage({ viewport: { width: 600, height: 900 }, locale: 'en-US' });
  narrowEnglish.setDefaultTimeout(8_000);
  await seed(narrowEnglish, baseState({ withTank: true }), 'en');
  await narrowEnglish.goto(`${baseUrl}/aquarium`, { waitUntil: 'networkidle' });
  await narrowEnglish.getByText('Livestock in Tank', { exact: true }).last().click();
  await narrowEnglish.getByRole('button', { name: 'Manage groups' }).click();
  assert.ok(await narrowEnglish.getByRole('heading', { name: /^Manage / }).isVisible());
  assert.ok(await narrowEnglish.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '600px English desktop must not overflow');

  console.log('guided navigation UI verified: onboarding, direct routes, livestock groups, mobile and narrow English desktop');
} finally {
  await browser.close();
}
