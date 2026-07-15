import { chromium } from 'playwright';

const baseUrl = process.env.AQUAGUIDE_PREVIEW_URL || 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const openPage = async (path) => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  return { page, errors };
};

try {
  {
    const { page, errors } = await openPage('/aquarium');
    await page.getByRole('button', { name: '开始今日检查', exact: true }).click();
    await page.getByText('一次完成今天检查', { exact: true }).waitFor();
    for (const label of ['正常', '清澈', '没有泡沫或油膜', '没有异味', '正常游动和进食', '没有特别操作']) {
      await page.getByRole('button', { name: label, exact: true }).click();
    }
    const generate = page.getByRole('button', { name: '生成检查结果', exact: true });
    assert(await generate.isEnabled(), '每日检查填写完整后仍不能生成结果');
    await generate.click();
    await page.getByText('结构化诊断结果', { exact: true }).waitFor();
    assert(errors.length === 0, `每日检查发生页面错误：${errors.join('；')}`);
    await page.close();
  }

  {
    const { page, errors } = await openPage('/care');
    await page.getByText('水质变差怎么办？', { exact: true }).last().click();
    await page.getByRole('button', { name: '开始问题自查', exact: true }).click();
    const panel = page.locator('section').filter({ hasText: '问题自查' }).last();
    await panel.getByText(/一次填完/).waitFor();
    assert(await panel.getByText('水体是否浑浊或有异味？', { exact: true }).count() === 1, '养护自查没有一次展示相关问题');
    const normalOptions = panel.getByRole('button', { name: '没有', exact: true });
    const optionCount = await normalOptions.count();
    assert(optionCount >= 2, '养护自查缺少可选答案');
    for (let index = optionCount - 1; index >= 0; index -= 1) await normalOptions.nth(index).click();
    const showResult = panel.getByRole('button', { name: '查看自查结果', exact: true });
    assert(await showResult.isEnabled(), '养护自查填写完整后仍不能生成结果');
    await showResult.click();
    await panel.getByText('自查结论', { exact: true }).waitFor();
    assert(errors.length === 0, `养护自查发生页面错误：${errors.join('；')}`);
    await page.close();
  }

  {
    const { page, errors } = await openPage('/aquarium');
    await page.getByRole('button', { name: '添加生物', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByPlaceholder('搜索鱼、虾、螺或学名');
    await search.fill('孔雀鱼');
    await dialog.getByText('孔雀鱼', { exact: true }).first().click();
    await search.fill('公子小丑');
    await dialog.getByText('公子小丑', { exact: true }).first().click();
    await dialog.getByRole('button', { name: '确认添加到鱼缸', exact: true }).click();
    await dialog.getByText('第 2 步：混养复核', { exact: true }).waitFor();
    assert(await search.count() === 0, '混养复核屏仍叠加显示生物选择长列表');
    assert(errors.length === 0, `添加生物发生页面错误：${errors.join('；')}`);
    await page.close();
  }

  console.log('三步交互浏览器验收通过：每日检查、养护自查、添加生物均进入独立结果屏。');
} finally {
  await browser.close();
}
