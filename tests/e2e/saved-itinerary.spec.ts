import { expect, test } from '@playwright/test';
import type { EditRequest, SaveItineraryRequest } from '@tripmate/contracts';

type SavedItineraryTestWindow = Window & {
  __d05Adapter?: {
    createRequests: Array<Extract<SaveItineraryRequest, { mode: 'create' }>>;
    overwriteRequests: Array<Extract<SaveItineraryRequest, { mode: 'overwrite' }>>;
    editRequests: EditRequest[];
  };
};

const previewPath = '/src/features/itinerary/saved-itinerary-preview.html';

test.describe('D-05 saved itinerary preview', () => {
  test('saves the current candidate as a new versioned snapshot', async ({ page }) => {
    await page.goto(previewPath);
    await expect(page.getByTestId('saved-itinerary')).toHaveCount(1);

    await page.getByTestId('save-new-itinerary').click();

    await expect(page.getByRole('status').first()).toContainText('已保存新行程 v1');
    await expect(page.getByTestId('saved-itinerary')).toHaveCount(2);
    await expect(page.getByTestId('reopened-snapshot')).toContainText('v1');

    const requests = await page.evaluate(
      () => (window as SavedItineraryTestWindow).__d05Adapter?.createRequests ?? [],
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      mode: 'create',
      candidate: {
        input: { trip: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } },
        commands: [],
      },
    });
  });

  test('reopens the exact saved snapshot through the adapter', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '重新打开版本 1' }).click();

    await expect(page.getByRole('status').first()).toContainText('已重新打开 v1 快照');
    await expect(page.getByTestId('reopened-snapshot')).toContainText('澳门两日文化行');
    await expect(page.getByTestId('reopened-snapshot')).toContainText('大三巴牌坊');
  });

  test('cancelling overwrite sends no mutation', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await page.getByRole('button', { name: '取消覆盖' }).click();

    expect(await page.evaluate(
      () => (window as SavedItineraryTestWindow).__d05Adapter?.overwriteRequests ?? [],
    )).toEqual([]);
  });

  test('confirmed overwrite uses expectedVersion and updates the visible library', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await page.getByRole('button', { name: '确认覆盖' }).click();

    await expect(page.getByRole('status').first()).toContainText('已覆盖保存为 v2');
    await expect(page.getByTestId('saved-itinerary').first()).toContainText('v2');
    await expect(page.getByText('保存版本 2')).toBeVisible();

    const requests = await page.evaluate(
      () => (window as SavedItineraryTestWindow).__d05Adapter?.overwriteRequests ?? [],
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      mode: 'overwrite',
      itineraryId: '50000000-0000-4000-8000-000000000001',
      expectedVersion: 1,
      confirmed: true,
    });
  });

  test('surfaces a version conflict and refreshes the actual saved version', async ({ page }) => {
    await page.goto(`${previewPath}?scenario=version-conflict`);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await page.getByRole('button', { name: '确认覆盖' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: '最新版本为 v2' }),
    ).toBeVisible();
    await expect(page.getByTestId('saved-itinerary').first()).toContainText('v2');
  });

  test('fails closed when creation is unavailable', async ({ page }) => {
    await page.goto(`${previewPath}?scenario=create-error`);

    await page.getByTestId('save-new-itinerary').click();

    await expect(page.getByRole('alert')).toContainText('保存服务暂时不可用');
    await expect(page.getByTestId('saved-itinerary')).toHaveCount(1);
  });

  test('remains usable at 320, 390 and 768 pixel widths', async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(previewPath);
      await expect(page.getByRole('heading', { name: '保存与重新打开' })).toBeVisible();

      const layout = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    }
  });
});
