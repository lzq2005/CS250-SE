import { test, expect } from '@playwright/test';
const entry = '/src/features/discovery/discovery-preview.html';

// No page.route, fixture HTTP body or fake fetch: browser -> Vite proxy -> actual Router -> SQLite.
test('real POI search, category, details, refresh and Back keep fixed IDs and unknowns', async ({ page }) => {
  await page.goto(entry);
  await expect(page.getByText('5 个地点')).toBeVisible();
  await page.getByRole('button', { name: '⌂ 历史', exact: true }).click();
  await expect(page.getByText('5 个地点')).toBeVisible();
  await page.getByRole('searchbox').fill('大三巴');
  await expect(page.getByText('1 个地点')).toBeVisible();
  await page.getByRole('link', { name: '查看详情' }).click();
  await expect(page).toHaveURL(/#\/pois\/8913d2bd-feaf-509d-8c02-560ef2e41510\?/);
  await expect(page.getByRole('heading', { name: '大三巴牌坊', exact: true })).toBeVisible();
  await expect(page.getByText('估计信息', { exact: false })).toBeVisible();
  await expect(page.getByText('未知 · 待来源核实', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '大三巴牌坊', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← 返回搜索结果' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('大三巴');
  await expect(page.getByRole('button', { name: '⌂ 历史', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
test('real records distinguish unknown fees, free admission and published weekly windows', async ({ page }) => {
  await page.goto(`${entry}#/pois/dc3578b4-eed7-56f4-9f2b-6c627d6cfb93`);
  await expect(page.getByRole('heading', { name: '妈阁庙', exact: true })).toBeVisible();
  await expect(page.getByText('费用未知', { exact: true })).toBeVisible();
  await expect(page.getByText('未知 · 待来源核实', { exact: true })).toBeVisible();
  await page.goto(`${entry}#/pois/273024e3-ae0c-5172-a486-e460efb96639`);
  await expect(page.getByRole('heading', { name: '郑家大屋', exact: true })).toBeVisible();
  await expect(page.getByText('免费', { exact: true })).toBeVisible();
  await expect(page.getByText('周一 10:00–18:00；最晚入场 17:30', { exact: true })).toBeVisible();
  await expect(page.getByLabel('地点收藏操作').getByRole('alert')).toContainText('暂不可用');
  await expect(page.getByLabel('地点收藏操作').getByRole('button', { name: '收藏此地点', exact: false })).toBeDisabled();
  const response = await page.request.get('/api/v1/pois');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.total).toBe(5);
  expect(new Set(body.data.items.map((poi: { id: string }) => poi.id)).size).toBe(5);
});
test('empty categories and missing records are honest; real list stays usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${entry}#/discover?category=nature`);
  await expect(page.getByRole('heading', { name: '没有找到匹配的地点' })).toBeVisible();
  await page.getByRole('button', { name: '查看全部地点' }).click();
  await expect(page.getByText('5 个地点')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('real-poi-mobile.png') });
  await page.goto(`${entry}#/pois/10000000-0000-4000-8000-000000000099`);
  await expect(page.getByRole('heading', { name: '地点资料未找到' })).toBeVisible();
  expect((await page.request.get('/api/v1/pois/10000000-0000-4000-8000-000000000099')).status()).toBe(404);
});
