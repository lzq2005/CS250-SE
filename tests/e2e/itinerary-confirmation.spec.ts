import { expect, test } from '@playwright/test';
import type { DraftEditRequest, SaveItineraryRequest } from '@tripmate/contracts';

type ConfirmationTestWindow = Window & {
  __d04EditRequests?: DraftEditRequest[];
  __d04OverwriteRequests?: Array<Extract<SaveItineraryRequest, { mode: 'overwrite' }>>;
};

const previewPath = '/src/features/itinerary/confirmation-preview.html';

test.describe('D-04 destructive itinerary confirmations', () => {
  test('cancelling stop removal performs no mutation', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '从当前日程移除 澳门博物馆' }).click();
    await expect(page.getByRole('dialog', { name: '从当前日程移除景点？' })).toBeVisible();
    await expect(page.getByRole('button', { name: /替换/ })).toHaveCount(0);
    await page.getByRole('button', { name: '取消移除' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('editor-stop')).toHaveCount(2);
    expect(await page.evaluate(() => (window as ConfirmationTestWindow).__d04EditRequests ?? [])).toEqual([]);
  });

  test('confirmed stop removal sends removeStop and keeps the POI unscheduled', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '从当前日程移除 澳门博物馆' }).click();
    await page.getByRole('button', { name: '确认移除' }).click();

    await expect(page.getByRole('status')).toContainText('景点已从当前日程移除');
    await expect(page.getByTestId('editor-stop')).toHaveCount(1);
    await expect(
      page.getByTestId('unscheduled-candidate').filter({ hasText: '澳门博物馆' }),
    ).toContainText('USER_REMOVED');

    const requests = await page.evaluate(
      () => (window as ConfirmationTestWindow).__d04EditRequests ?? [],
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      action: 'editDraft',
      command: {
        type: 'removeStop',
        stopId: 'b2222222-2222-4222-8222-222222222222',
        confirmed: true,
      },
    });
  });

  test('adapter failure keeps the stop and the confirmation open', async ({ page }) => {
    await page.goto(`${previewPath}?scenario=edit-error`);

    await page.getByRole('button', { name: '从当前日程移除 澳门博物馆' }).click();
    await page.getByRole('button', { name: '确认移除' }).click();

    await expect(page.getByRole('dialog', { name: '从当前日程移除景点？' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('候选删除暂时失败');
    await expect(page.getByTestId('editor-stop')).toHaveCount(2);
  });

  test('cancelling overwrite performs no save mutation', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await expect(page.getByRole('dialog', { name: '覆盖已保存行程？' })).toBeVisible();
    await page.getByRole('button', { name: '取消覆盖' }).click();

    expect(
      await page.evaluate(() => (window as ConfirmationTestWindow).__d04OverwriteRequests ?? []),
    ).toEqual([]);
    await expect(page.getByText('保存版本 3')).toBeVisible();
  });

  test('confirmed overwrite sends expectedVersion and confirmed true', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await page.getByRole('button', { name: '确认覆盖' }).click();

    await expect(page.getByRole('status')).toContainText('保存行程已覆盖');
    const requests = await page.evaluate(
      () => (window as ConfirmationTestWindow).__d04OverwriteRequests ?? [],
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      mode: 'overwrite',
      itineraryId: '50000000-0000-4000-8000-000000000001',
      expectedVersion: 3,
      confirmed: true,
    });
  });

  test('failed overwrite keeps the dialog open and sends no saved result', async ({ page }) => {
    await page.goto(`${previewPath}?scenario=overwrite-error`);

    await page.getByRole('button', { name: '覆盖已保存行程' }).click();
    await page.getByRole('button', { name: '确认覆盖' }).click();

    const dialog = page.getByRole('dialog', { name: '覆盖已保存行程？' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText('覆盖暂时失败');

    const requests = await page.evaluate(
      () => (window as ConfirmationTestWindow).__d04OverwriteRequests ?? [],
    );
    expect(requests).toHaveLength(0);
  });

  test('confirmation surfaces remain usable at 320, 390 and 768 pixels', async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(previewPath);
      await page.getByRole('button', { name: '覆盖已保存行程' }).click();

      const layout = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
      await page.getByRole('button', { name: '取消覆盖' }).click();
    }
  });
});
