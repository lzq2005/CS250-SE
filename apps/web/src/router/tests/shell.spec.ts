import { test, expect } from '@playwright/test';

test('four tabs and four shortcuts provide honest, recoverable destinations', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(page.getByRole('link', { name: '开始规划', exact: false })).toHaveCount(0);
  await expect(page.locator('.shortcut-grid a')).toHaveCount(4);
  const photo = await page.locator('.home-scene').evaluate(el => getComputedStyle(el, '::before').backgroundImage);
  const photoUrl = photo.match(/url\("([^"]+)"\)/)?.[1];
  expect(photoUrl).toBeTruthy();
  const photoResponse = await page.request.get(photoUrl!);
  expect(photoResponse.ok()).toBe(true);
  expect(photoResponse.headers()['content-type']).toContain('image/');
  await page.screenshot({ path: test.info().outputPath('home-desktop.png') });
  for (const [path, heading] of [['discover', '发现澳门'], ['map', '澳门地图'], ['mine', '我的']] as const) {
    await nav.locator(`a[href="#/${path}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', `#/${path}`);
    await expect(page.getByText('此功能正在开发，暂不能进行实际操作。完成后会在这里开放。')).toBeVisible();
    if (path === 'discover') await page.screenshot({ path: test.info().outputPath('discover-desktop.png') });
  }
  for (const [path, heading] of [['trip', '旅行规划'], ['favorites', '地点收藏'], ['trips', '我的澳门行程'], ['plaza', '行程广场']] as const) {
    await nav.locator('a[href="#/home"]').click();
    await page.locator(`.shortcut-grid a[href="#/${path}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  }
  await expect(page.locator('#main-content')).toBeFocused();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('行程广场');
  await page.getByRole('link', { name: '返回首页', exact: false }).first().click();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('行程广场');
  await page.goForward();
  await expect(page.locator('#home-title')).toBeVisible();
  await page.goto('/#/missing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('页面未找到');
  await page.getByRole('link', { name: '回到首页', exact: false }).click();
  await expect(page.locator('#home-title')).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile shell fits 320/390/768 px and supports keyboard navigation', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: test.info().outputPath('home-mobile.png') });
    const nav = page.getByRole('navigation', { name: '主导航', exact: true });
    await expect(nav).toBeVisible();
    await nav.locator('a[href="#/mine"]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('我的');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: test.info().outputPath('mine-mobile.png') });
  }
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});
