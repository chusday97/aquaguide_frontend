import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });

const createState = (speciesCount = 0) => ({
  version: 1,
  currentAquariumId: 'tank-c',
  aquariums: [{
    id: 'tank-c',
    name: 'Beginner Community Aquarium',
    fishes: Array.from({ length: speciesCount }, (_, index) => ({
      id: `stock-${index + 1}`,
      fishId: `sp_${String(index + 1).padStart(4, '0')}`,
      quantity: index + 1,
      entryDate: '2026-07-20T00:00:00.000Z',
      lastWaterChangeDate: '2026-07-20T00:00:00.000Z',
      batches: [{
        id: `batch-${index + 1}`,
        quantity: index + 1,
        entryDate: '2026-07-20T00:00:00.000Z',
        lifeStage: index % 2 === 0 ? 'juvenile' : 'adult',
        reproductiveState: 'normal',
        stateUpdatedAt: '2026-07-20T00:00:00.000Z',
      }],
    })),
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
});

const seed = async (page, state = createState()) => {
  await page.addInitScript(saved => {
    localStorage.setItem('aquarium_app_state_v1', JSON.stringify(saved));
    localStorage.setItem('aquaguide_locale', 'en');
  }, state);
};

const assertNoHorizontalOverflow = async page => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
};

const assertControlInsideViewport = async (locator, label) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box, `${label} must be visible`);
  const viewportWidth = await locator.evaluate(() => window.innerWidth);
  assert.ok(box.x >= 0 && box.x + box.width <= viewportWidth + 0.5, `${label} must stay inside the viewport`);
  assert.equal(await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit && (hit === element || element.contains(hit)));
  }), true, `${label} center must hit the intended control`);
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
    assert.equal(await page.locator('.aquarium-workspace-zone > .aquarium-zone-header h2').count(), 3, 'task zones must use semantic headings');
    assert.deepEqual(await page.locator('.aquarium-workspace-zone').evaluateAll(nodes => nodes.map(node => node.classList.contains('aquarium-observe-zone') ? 'observe' : node.classList.contains('aquarium-manage-zone') ? 'manage' : 'learn')), ['observe', 'manage', 'learn']);
    if (width === 1440) {
      const [tankBox, statusBox, archiveBox, actionsBox, discoveryBox, basicsBox] = await Promise.all([
        page.locator('.aquarium-tank').boundingBox(),
        page.locator('.aquarium-status').boundingBox(),
        page.locator('.aquarium-archive').boundingBox(),
        page.locator('.aquarium-actions').boundingBox(),
        page.locator('.aquarium-discovery').boundingBox(),
        page.locator('.aquarium-basics').boundingBox(),
      ]);
      assert.ok(tankBox && statusBox && tankBox.x < statusBox.x, 'Observe must place tank before today action');
      assert.ok(archiveBox && actionsBox && archiveBox.x < actionsBox.x, 'Manage must place livestock before quick actions');
      assert.ok(discoveryBox && basicsBox && discoveryBox.x < basicsBox.x, 'Learn must place discovery before tank basics');
      assert.ok(archiveBox.height > 190 && archiveBox.height < actionsBox.height + 40, 'desktop livestock module must use its column with a compact preview');
    }
    if (width === 600) {
      const newAquarium = page.getByRole('button', { name: 'New Aquarium' });
      await assertControlInsideViewport(newAquarium, '600px New Aquarium');
      await assertControlInsideViewport(page.getByRole('button', { name: 'Browse Care Guides' }), '600px Browse Care Guides');
      await newAquarium.click();
      await page.getByText(/Created new aquarium/).waitFor();
    }
    await assertNoHorizontalOverflow(page);
    await page.close();
  }

  for (const speciesCount of [1, 2, 4]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
    await seed(page, createState(speciesCount));
    await page.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Tank Basics' }).waitFor();
    assert.equal(await page.locator('.aquarium-archive-preview img').count(), speciesCount, `${speciesCount}-species preview must show every seeded species`);
    const archive = page.locator('.aquarium-archive');
    await archive.locator('button[aria-expanded="false"]').click();
    await archive.locator('#aquarium-records-content').waitFor();
    assert.equal(await archive.locator('.aquarium-archive-preview').count(), 0, 'compact preview must leave the DOM when full livestock content opens');
    await page.close();
  }

  const emptyDesktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  await seed(emptyDesktop);
  await emptyDesktop.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
  await emptyDesktop.getByRole('button', { name: 'Add Livestock' }).click();
  await emptyDesktop.getByRole('dialog').waitFor();
  await emptyDesktop.close();

  for (const width of [320, 375, 390, 430]) {
    const phone = await browser.newPage({
      viewport: { width, height: 844 },
      locale: 'en-US',
      hasTouch: true,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    await seed(phone);
    await phone.goto(`${baseUrl}/aquarium`, { waitUntil: 'domcontentloaded' });
    await phone.getByRole('heading', { name: 'Tank Basics' }).waitFor();
    const onboardingBox = await phone.locator('.aquarium-onboarding').boundingBox();
    const observeBox = await phone.locator('.aquarium-observe-zone').boundingBox();
    assert.ok(onboardingBox && observeBox && onboardingBox.y + onboardingBox.height < observeBox.y, 'onboarding must stay before Observe on phone');
    const zonePositions = await phone.locator('.aquarium-zone-header').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
    assert.ok(zonePositions[0] < zonePositions[1] && zonePositions[1] < zonePositions[2], 'phone task zones must keep Observe → Manage → Learn order');
    await assertControlInsideViewport(phone.getByText('View all 4 steps', { exact: true }), `${width}px onboarding details`);
    assert.equal(await phone.getByText('Advanced Water Tests (Optional)', { exact: true }).count(), 1);
    await assertNoHorizontalOverflow(phone);
    await phone.close();
  }

  console.log('aquarium homepage C verified: guided zones, optional advanced tests, and responsive English layout');
} finally {
  await browser.close();
}
