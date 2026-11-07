import { test, expect } from '@playwright/test';
const key = 'tripmate.activeTripId';
test('Shell home -> real A04 save -> activeTrip restore -> actual POI search/detail uses one navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('.shortcut-grid a[href="#/trip"]').click();
  await expect(page.getByRole('heading', { name: '旅行信息设置', exact: true })).toBeVisible();
  await page.getByLabel('旅行名称', { exact: true }).fill('Shell real integration');
  await page.getByLabel('开始日期', { exact: true }).fill('2026-11-10');
  await page.getByLabel('结束日期', { exact: true }).fill('2026-11-10');
  await page.getByLabel('结束日期', { exact: true }).blur();
  await page.getByLabel('开始 2026-11-10', { exact: true }).fill('09:00');
  await page.getByLabel('结束 2026-11-10', { exact: true }).fill('18:00');
  await page.getByLabel('澳门出发点', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: '保存旅行', exact: true }).click();
  await expect(page.getByRole('region', { name: '旅行信息设置' }).getByRole('status')).toHaveText('旅行已保存');
  await expect(page.getByLabel('当前旅行')).toContainText('Shell real integration');
  const tripId = await page.evaluate(k => localStorage.getItem(k), key); expect(tripId).toMatch(/^[\da-f-]{36}$/);
  await page.reload();
  await expect(page.getByLabel('旅行名称', { exact: true })).toHaveValue('Shell real integration');
  await expect(page.getByLabel('当前旅行')).toContainText('Shell real integration');
  await page.getByRole('navigation', { name: '主导航', exact: true }).locator('a[href="#/discover"]').click();
  await expect(page.getByText('5 个地点')).toBeVisible();
  await page.getByRole('searchbox').fill('大三巴'); await expect(page.getByText('1 个地点')).toBeVisible();
  await page.getByRole('link', { name: '查看详情' }).click();
  await expect(page.getByRole('heading', { name: '大三巴牌坊', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航', exact: true }).locator('[aria-current="page"]')).toHaveAttribute('href', '#/discover');
  await page.reload(); await expect(page.getByRole('heading', { name: '大三巴牌坊', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← 返回搜索结果' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('大三巴');
  await expect(page.getByLabel('当前旅行')).toContainText('Shell real integration');
});
test('restored missing Trip clears ID; service failure retains ID and supports retry', async ({ page }) => {
  const id = 'c0000000-0000-4000-8000-000000000099';
  await page.addInitScript(({ key, id }) => localStorage.setItem(key, id), { key, id });
  await page.goto('/#/trip');
  await expect(page.getByRole('heading', { name: '旅行信息设置', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  await page.route(`**/api/v1/trips/${id}`, route => route.fulfill({ status: 503, json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Temporary', details: null } } }));
  await page.reload(); await expect(page.getByLabel('当前旅行')).toContainText('暂时无法验证');
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(id);
  await page.unroute(`**/api/v1/trips/${id}`);
  await page.getByRole('button', { name: '重新验证旅行' }).click();
  await expect(page.getByLabel('当前旅行')).toHaveCount(0);
});
test('actual B Shell embeds actual D component; D receives props and never owns routing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/src/router/tests/integration-preview.html');
    await page.locator('.shortcut-grid a[href="#/trips"]').click();
    await expect(page.getByRole('heading', { name: 'B+D 组件集成测试', exact: true })).toBeVisible();
    await expect(page.locator('.itinerary-display')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: '主导航', exact: true })).toHaveCount(1);
    await expect(page.getByText('仅组件测试数据，非正式保存行程')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: test.info().outputPath('b-d-shell-mobile.png') });
    await page.reload(); await expect(page.getByRole('heading', { name: 'B+D 组件集成测试', exact: true })).toBeVisible();
    await page.getByRole('navigation', { name: '主导航', exact: true }).locator('a[href="#/home"]').click();
    await expect(page.locator('#home-title')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('merged D02 map mounts in sole Shell outlet and survives rapid navigation at all widths', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  // Provider availability is outside this component regression; Leaflet itself is real.
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2X8AAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/src/router/tests/integration-preview.html');
  const headingBefore = await page.locator('#home-title').evaluate(el => getComputedStyle(el).fontSize);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (let round = 0; round < 3; round++) {
      await page.locator('.bottom-nav a[href="#/map"]').click();
      await expect(page.getByTestId('map-stop-marker')).toHaveCount(2);
      await expect(page.getByRole('navigation', { name: '主导航', exact: true })).toHaveCount(1);
      await expect(page.locator('.bottom-nav [aria-current="page"]')).toHaveAttribute('href', '#/map');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: '第 2 天 2026-11-04' }).click();
      await expect(page.getByTestId('map-stop-marker')).toHaveCount(1);
      await page.locator('.bottom-nav a[href="#/home"]').click();
      await expect(page.getByTestId('itinerary-map')).toHaveCount(0);
      // Wait beyond Leaflet's former deferred zoom callback before remounting.
      await page.waitForTimeout(300);
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.locator('#home-title').evaluate(el => getComputedStyle(el).fontSize)).toBe(headingBefore);
  expect(errors).toEqual([]);
});
