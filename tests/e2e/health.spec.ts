import { test, expect } from '@playwright/test';
test('Vue calls API through Vite proxy and reconnects', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('API 与数据库连接正常');
  await page.getByRole('button', { name: '重新检查' }).click();
  await expect(page.getByRole('status')).toHaveText('API 与数据库连接正常');
});
test('Vue exposes an actionable failure state', async ({ page }) => {
  await page.route('**/api/v1/health', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'STORAGE_UNAVAILABLE', message: '数据库暂时不可用', details: null } }) }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('数据库暂时不可用');
  await expect(page.getByRole('button', { name: '重新检查' })).toBeEnabled();
});
