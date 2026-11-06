import { test, expect } from '@playwright/test';
import fixtures from './pois.synthetic.json' with { type: 'json' };
const entry = '/src/features/discovery/discovery-preview.html';

test.beforeEach(async ({ page }) => {
  // Browser HTTP responses are controlled test fixtures, not a production mock API.
  await page.route('**/api/v1/favorites/*', route => route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'Test module not registered', details: null } } }));
  await page.route('**/api/v1/pois**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/pois') {
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const category = url.searchParams.get('category');
      const items = fixtures.filter(p => (!category || p.category === category) &&
        (!search || [p.name, p.address, ...p.tags].some(value => value.toLowerCase().includes(search))));
      await route.fulfill({ json: { data: { items, total: items.length } } });
    } else {
      const poi = fixtures.find(p => p.id === url.pathname.split('/').at(-1));
      await route.fulfill(poi ? { json: { data: poi } } : { status: 404, json: { error: { code: 'NOT_FOUND', message: 'Missing', details: null } } });
    }
  });
});
test('uses contracted HTTP query, details and browser history without losing filters', async ({ page }) => {
  await page.goto(entry);
  await expect(page.getByText('8 个地点')).toBeVisible();
  await page.getByRole('button', { name: '⌂ 历史', exact: true }).click();
  await expect(page.getByText('2 个地点')).toBeVisible();
  const request = page.waitForRequest(r => r.url().includes('/api/v1/pois?search=alpha&category=history'));
  await page.getByRole('searchbox').fill('alpha');
  await request;
  await expect(page.getByText('1 个地点')).toBeVisible();
  await page.getByRole('link', { name: '查看详情' }).click();
  await expect(page.getByRole('heading', { name: '测试景点 Alpha' })).toBeVisible();
  await expect(page.getByText('费用未知', { exact: true })).toBeVisible();
  await expect(page.getByText('仅合成测试数据，不代表真实地点，请勿用于旅行规划。')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '测试景点 Alpha' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('alpha');
  await expect(page.getByRole('button', { name: '⌂ 历史', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
test('shows empty, unknown, known closed/free and missing detail distinctly', async ({ page }) => {
  await page.goto(`${entry}#/discover?search=不存在`);
  await expect(page.getByRole('heading', { name: '没有找到匹配的地点' })).toBeVisible();
  await page.getByRole('button', { name: '查看全部地点' }).click();
  await page.getByRole('link', { name: '测试景点 Beta', exact: true }).click();
  await expect(page.getByText('免费', { exact: true })).toBeVisible();
  await expect(page.getByText('已知整周关闭', { exact: true })).toBeVisible();
  await expect(page.getByLabel('地点收藏操作').getByRole('button', { name: '收藏此地点', exact: false })).toBeDisabled();
  await page.goto(`${entry}#/pois/10000000-0000-4000-8000-000000000099`);
  await expect(page.getByRole('heading', { name: '地点资料未找到' })).toBeVisible();
});
test('unregistered API and recovery are visible; no silent fallback data', async ({ page }) => {
  await page.route('**/api/v1/pois', route => route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', details: null } } }));
  await page.goto(entry);
  await expect(page.getByRole('alert')).toContainText('景点服务尚未接入');
  await expect(page.locator('.poi-card')).toHaveCount(0);
  await page.unroute('**/api/v1/pois');
  await page.getByRole('button', { name: '重新尝试' }).click();
  await expect(page.getByText('8 个地点')).toBeVisible();
});
test('320/390/768 px remain usable; rapid category changes cancel stale responses', async ({ page }) => {
  const faults: string[] = []; page.on('pageerror', error => faults.push(error.message));
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto(entry);
    await expect(page.getByText('8 个地点')).toBeVisible();
    await page.getByRole('button', { name: '♧ 美食', exact: true }).click();
    await page.getByRole('button', { name: '❀ 自然', exact: true }).click();
    await expect(page.getByText('2 个地点')).toBeVisible();
    await expect(page.locator('.category-label').first()).toHaveText('自然');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: test.info().outputPath('discovery-mobile.png') });
  }
  expect(faults).toEqual([]);
});
