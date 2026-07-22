import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });

const state = {
  version: 1,
  currentAquariumId: 'tank-c',
  aquariums: [{
    id: 'tank-c',
    name: 'Beginner Community Aquarium',
    fishes: [],
    lastWaterChangeDate: '2026-07-20T00:00:00.000Z',
    dimensions: { length: '60', width: '40', height: '40' },
    waterType: 'Freshwater',
    targetTemperature: '25',
    substrate: '无',
    plants: [],
    hardscape: [],
    equipment: { filter: '瀑布过滤', heater: true, oxygen: false, light: '普通灯' },
  }],
  wishlist: [],
  dismissedRecommendations: [],
  diagnosisRecords: [],
  compatibilityRecords: [],
  deceasedRecords: [],
  feedingRecords: [],
  observationRecords: [],
  riskReminderState: {},
  onboarding: { version: 1, status: 'completed', viewedSpecies: true, aquariumConfigured: true, taskCardDismissed: false },
  updatedAt: new Date().toISOString(),
};

const seed = async page => {
  await page.addInitScript(saved => {
    localStorage.setItem('aquarium_app_state_v1', JSON.stringify(saved));
    localStorage.setItem('aquaguide_locale', 'en');
  }, state);
};

const assertNoHorizontalOverflow = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
};

try {
  for (const width of [1440, 1000, 600]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'en-US' });
    await seed(page);
    await page.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Tank Basics' }).waitFor();
    assert.deepEqual(await page.locator('.aquarium-zone-header').allTextContents().then(items => items.map(item => item.replace(/\s+/g, ' ').trim()).map(item => item.match(/Observe|Manage|Learn & Maintain/)?.[0])), ['Observe', 'Manage', 'Learn & Maintain']);
    assert.equal(await page.locator('.aquarium-recommend:visible').count(), 0, 'duplicate next-action panel must stay hidden');
    assert.equal(await page.locator('.aquarium-advanced-tests').getAttribute('open'), null, 'advanced tests must be collapsed by default');
    await assertNoHorizontalOverflow(page);
    await page.close();
  }

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  await seed(phone);
  await phone.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
  await phone.getByRole('heading', { name: 'Tank Basics' }).waitFor();
  const zonePositions = await phone.locator('.aquarium-zone-header').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
  assert.ok(zonePositions[0] < zonePositions[1] && zonePositions[1] < zonePositions[2], 'phone task zones must keep Observe → Manage → Learn order');
  assert.equal(await phone.getByText('Advanced Water Tests (Optional)', { exact: true }).count(), 1);
  await assertNoHorizontalOverflow(phone);

  console.log('aquarium homepage C verified: guided zones, optional advanced tests, and responsive English layout');
} finally {
  await browser.close();
}
