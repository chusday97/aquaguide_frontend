import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PREVIEW_URL || 'http://localhost:3000';
const fixture = resolve('public/responsive/care/pregnant_fish_breeder_box_realistic-960.webp');
const browser = await chromium.launch({ headless: true });

try {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'zh-CN',
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  const mobile = await mobileContext.newPage();
  const errors = [];
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`${baseUrl}/identify`, { waitUntil: 'networkidle' });
  await mobile.getByRole('heading', { name: '拍照识别与状态判断' }).waitFor();
  assert.ok(await mobile.getByRole('button', { name: /拍照或选择图片/ }).isVisible());
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390px upload page must not overflow');

  await mobile.locator('input[type=file]').setInputFiles(fixture);
  await mobile.getByText('视觉模型未配置或暂不可用').waitFor({ timeout: 20_000 });
  await mobile.getByLabel('没有合适候选？手动搜索物种库').fill('孔雀鱼');
  const manualCandidate = mobile.getByRole('button', { name: /孔雀鱼/ }).first();
  await manualCandidate.waitFor();
  await manualCandidate.click();
  await mobile.getByRole('heading', { name: '它现在有什么异常？' }).waitFor();
  await mobile.locator('textarea').fill('全缸不动并急促呼吸');
  await mobile.getByRole('button', { name: '开始判断' }).click();
  await mobile.getByText('先做应急动作，再补充信息').waitFor({ timeout: 20_000 });
  await mobile.getByRole('heading', { name: '它现在能保持正常姿态吗？' }).waitFor();
  assert.ok(await mobile.getByText(/立即增强水面扰动并开启增氧/).isVisible());
  await mobile.getByRole('button', { name: '提前查看当前结果' }).click();
  await mobile.getByRole('heading', { name: '状态判断', exact: true }).waitFor();
  assert.ok(await mobile.getByText('更可能', { exact: true }).first().isVisible());
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '390px result must not overflow');
  assert.deepEqual(errors, []);

  const desktop = await browser.newPage({ viewport: { width: 1200, height: 900 }, locale: 'en-US' });
  await desktop.addInitScript(() => localStorage.setItem('aquaguide_locale', 'en'));
  await desktop.goto(`${baseUrl}/identify`, { waitUntil: 'networkidle' });
  await desktop.getByRole('heading', { name: 'Photo ID & Health Triage' }).waitFor();
  assert.ok(await desktop.getByText(/processed in server memory/i).isVisible());
  assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '1200px English page must not overflow');

  for (const width of [600, 1440]) {
    const desktopWidth = await browser.newPage({ viewport: { width, height: 900 }, locale: 'zh-CN' });
    await desktopWidth.goto(`${baseUrl}/identify`, { waitUntil: 'networkidle' });
    assert.ok(await desktopWidth.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${width}px desktop page must not overflow`);
    await desktopWidth.close();
  }

  const guide = await mobileContext.newPage();
  await guide.goto(`${baseUrl}/encyclopedia`, { waitUntil: 'networkidle' });
  await guide.getByRole('button', { name: /识别/ }).waitFor();
  await guide.getByRole('button', { name: /识别/ }).click();
  await guide.waitForURL('**/identify');

  console.log('species identification UI: mobile fallback, urgent triage, English desktop, and guide entry passed');
} finally {
  await browser.close();
}
