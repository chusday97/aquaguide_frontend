import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

const seedOnboarding = async page => {
  await page.addInitScript(() => localStorage.setItem('aquarium_app_state_v1', JSON.stringify({
    version: 1,
    currentAquariumId: '',
    aquariums: [],
    wishlist: [],
    dismissedRecommendations: [],
    diagnosisRecords: [],
    compatibilityRecords: [],
    deceasedRecords: [],
    feedingRecords: [],
    observationRecords: [],
    riskReminderState: {},
    onboarding: { version: 1, status: 'skipped', viewedSpecies: false, taskCardDismissed: false },
    updatedAt: new Date().toISOString(),
  })));
};

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 820 }, locale: 'en-US' });
  await seedOnboarding(desktop);
  await desktop.goto('http://localhost:3000/aquarium', { waitUntil: 'domcontentloaded' });
  await desktop.getByRole('button', { name: 'Settings' }).click();
  await desktop.waitForURL('**/settings');
  assert.equal(await desktop.locator('html').getAttribute('lang'), 'en');
  await desktop.getByRole('radio', { name: '简体中文' }).click();
  assert.equal(await desktop.locator('html').getAttribute('lang'), 'zh-CN');
  await desktop.reload({ waitUntil: 'domcontentloaded' });
  await desktop.getByRole('button', { name: /我的鱼缸/ }).waitFor();

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  await seedOnboarding(phone);
  await phone.goto('http://localhost:3000/aquarium', { waitUntil: 'domcontentloaded' });
  const phoneSettingsButton = phone.getByRole('button', { name: '设置' });
  const phoneSettingsBox = await phoneSettingsButton.boundingBox();
  assert.ok(phoneSettingsBox && phoneSettingsBox.width >= 44 && phoneSettingsBox.height >= 44, 'phone settings target must be at least 44px');
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await phoneSettingsButton.click();
  await phone.waitForURL('**/settings');
  await phone.getByRole('radio', { name: 'English' }).click();
  assert.equal(await phone.locator('html').getAttribute('lang'), 'en');
  await phone.getByRole('navigation').getByText('Collection', { exact: true }).waitFor();

  console.log('localization UI verified: browser default, desktop/mobile settings, instant switch and persistence');
} finally {
  await browser.close();
}
