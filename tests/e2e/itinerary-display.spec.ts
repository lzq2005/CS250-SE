import { expect, test } from '@playwright/test';

test.describe('D-01 itinerary display fixture preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/features/itinerary/itinerary-preview.html');
  });

  test('groups ordered stops by itinerary date', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: '我的澳门行程' })).toBeVisible();

    const dayTitles = page.getByTestId('day-title');
    await expect(dayTitles).toHaveText([
      '第 1 天 · 2026-11-03',
      '第 2 天 · 2026-11-04',
    ]);

    const firstDay = page.getByTestId('itinerary-day-2026-11-03');
    const firstDayStops = firstDay.getByTestId('stop-item');
    await expect(firstDayStops).toHaveCount(2);
    await expect(firstDayStops.nth(0)).toContainText('大三巴牌坊');
    await expect(firstDayStops.nth(1)).toContainText('澳门博物馆');

    const secondDay = page.getByTestId('itinerary-day-2026-11-04');
    const secondDayStops = secondDay.getByTestId('stop-item');
    await expect(secondDayStops).toHaveCount(1);
    await expect(secondDayStops.nth(0)).toContainText('龙环葡韵');
  });

  test('shows known times and preserves unknown times as pending', async ({ page }) => {
    const knownStop = page.getByTestId('stop-item').filter({
      has: page.getByRole('heading', { level: 3, name: '大三巴牌坊' }),
    });
    await expect(knownStop).toContainText('10:00');
    await expect(knownStop).toContainText('11:30');

    const unknownStop = page.getByTestId('stop-item').filter({
      has: page.getByRole('heading', { level: 3, name: '澳门博物馆' }),
    });
    await expect(unknownStop).toContainText('待确定');
    await expect(unknownStop).not.toContainText('00:00');
    await expect(page.locator('main')).not.toContainText('00:00');
  });

  test('shows transport mode, duration and estimate status', async ({ page }) => {
    const firstDay = page.getByTestId('itinerary-day-2026-11-03');
    const legs = firstDay.getByTestId('travel-leg');

    await expect(legs).toHaveCount(2);
    await expect(legs.nth(0)).toContainText('步行');
    await expect(legs.nth(0)).toContainText('12 分钟');
    await expect(legs.nth(0)).toContainText('预计');
    await expect(legs.nth(1)).toContainText('公交');
    await expect(legs.nth(1)).toContainText('时长待确定');
    await expect(legs.nth(1)).toContainText('未知');
  });

  test('shows every unscheduled POI and warning with usable labels', async ({ page }) => {
    const unscheduled = page.getByTestId('unscheduled-item');
    await expect(unscheduled).toHaveCount(2);
    await expect(unscheduled.nth(0)).toContainText('氹仔旧城区');
    await expect(unscheduled.nth(0)).toContainText('每日时间窗口不足');
    await expect(unscheduled.nth(1)).toContainText('地点资料不可用');

    const warnings = page.getByTestId('warning-item');
    await expect(warnings).toHaveCount(3);
    await expect(page.getByTestId('warning-list')).toContainText('关闭');
    await expect(page.getByTestId('warning-list')).toContainText('交通估算未知');
    await expect(page.getByTestId('warning-list')).toContainText('未安排');
  });

  test('keeps the itinerary readable without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await expect(page.getByRole('heading', { level: 1, name: '我的澳门行程' })).toBeVisible();
    await expect(page.getByTestId('stop-item')).toHaveCount(3);
    await expect(page.getByTestId('unscheduled-item')).toHaveCount(2);

    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
    }));

    expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });

  test('matches transport by destination when legs are reordered or missing', async ({ page }) => {
    await page.goto('/src/features/itinerary/itinerary-preview.html?scenario=leg-boundary');

    const ruinsLeg = page
      .getByTestId('stop-item')
      .filter({ has: page.getByRole('heading', { level: 3, name: '大三巴牌坊' }) })
      .getByTestId('travel-leg');
    await expect(ruinsLeg).toContainText('步行');
    await expect(ruinsLeg).toContainText('从行程起点');
    await expect(ruinsLeg).toContainText('12 分钟');
    await expect(ruinsLeg).not.toContainText('公交');

    const museumLeg = page
      .getByTestId('stop-item')
      .filter({ has: page.getByRole('heading', { level: 3, name: '澳门博物馆' }) })
      .getByTestId('travel-leg');
    await expect(museumLeg).toContainText('公交');
    await expect(museumLeg).toContainText('从大三巴牌坊出发');
    await expect(museumLeg).not.toContainText('步行');

    const missingDayLeg = page
      .getByTestId('itinerary-day-2026-11-04')
      .getByTestId('travel-leg');
    await expect(missingDayLeg).toContainText('交通资料不可用');
    await expect(missingDayLeg).not.toContainText('出租车');
  });
});
