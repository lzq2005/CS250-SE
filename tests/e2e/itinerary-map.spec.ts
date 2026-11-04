import { expect, test } from '@playwright/test';

const firstDayPath = '/src/features/map/map-preview.html';
const boundaryPath = '/src/features/map/map-preview.html?scenario=missing-poi';

test.describe('D-02 itinerary map fixture preview', () => {
  test('renders numbered markers in itinerary stop order', async ({ page }) => {
    await page.goto(firstDayPath);

    await expect(page.getByRole('heading', { level: 1, name: '行程地图' })).toBeVisible();

    const markers = page.getByTestId('map-stop-marker');
    await expect(markers).toHaveCount(2);
    await expect(markers.nth(0)).toHaveAttribute('data-sequence', '1');
    await expect(markers.nth(0)).toHaveAttribute(
      'data-poi-id',
      '11111111-1111-4111-8111-111111111111',
    );
    await expect(markers.nth(1)).toHaveAttribute('data-sequence', '2');
    await expect(markers.nth(1)).toHaveAttribute(
      'data-poi-id',
      '22222222-2222-4222-8222-222222222222',
    );

    const orderedRows = page.getByTestId('map-stop-row');
    await expect(orderedRows).toHaveCount(2);
    await expect(orderedRows.nth(0)).toContainText('大三巴牌坊');
    await expect(orderedRows.nth(1)).toContainText('澳门博物馆');
  });

  test('updates markers when the active itinerary day changes', async ({ page }) => {
    await page.goto(firstDayPath);

    await page.getByRole('button', { name: '第 2 天 2026-11-04' }).click();

    const markers = page.getByTestId('map-stop-marker');
    await expect(markers).toHaveCount(1);
    await expect(markers.first()).toHaveAttribute('data-sequence', '1');
    await expect(markers.first()).toHaveAttribute(
      'data-poi-id',
      '33333333-3333-4333-8333-333333333333',
    );

    const orderedRows = page.getByTestId('map-stop-row');
    await expect(orderedRows).toHaveCount(1);
    await expect(orderedRows.first()).toContainText('龙环葡韵');
  });

  test('keeps sequence numbers and shows a missing-POI coordinate message', async ({ page }) => {
    await page.goto(boundaryPath);

    const orderedRows = page.getByTestId('map-stop-row');
    await expect(orderedRows).toHaveCount(2);
    await expect(orderedRows.nth(0)).toContainText('地点坐标不可用');
    await expect(orderedRows.nth(1)).toContainText('澳门博物馆');

    const markers = page.getByTestId('map-stop-marker');
    await expect(markers).toHaveCount(1);
    await expect(markers.first()).toHaveAttribute('data-sequence', '2');
    await expect(markers.first()).toHaveAttribute(
      'data-poi-id',
      '22222222-2222-4222-8222-222222222222',
    );
  });

  test('keeps map and ordered stops within a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(firstDayPath);

    await expect(page.getByTestId('itinerary-map')).toBeVisible();
    await expect(page.getByTestId('map-stop-marker')).toHaveCount(2);
    await expect(page.getByTestId('map-stop-row')).toHaveCount(2);

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }));

    expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });
});
