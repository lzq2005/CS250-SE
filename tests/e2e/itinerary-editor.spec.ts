import { expect, test } from '@playwright/test';
import type { DraftEditRequest } from '@tripmate/contracts';

type EditorTestWindow = Window & {
  __d03Requests?: DraftEditRequest[];
};

const previewPath = '/src/features/itinerary/editor-preview.html';

test.describe('D-03 itinerary editor fixture preview', () => {
  test('shows candidate stops in order without unsupported reorder controls', async ({ page }) => {
    await page.goto(previewPath);

    await expect(page.getByRole('heading', { level: 1, name: '编辑行程' })).toBeVisible();
    await expect(page.getByTestId('editor-stop')).toHaveCount(2);
    await expect(page.getByTestId('editor-stop').nth(0)).toContainText('大三巴牌坊');
    await expect(page.getByTestId('editor-stop').nth(1)).toContainText('澳门博物馆');
    await expect(page.getByRole('button', { name: /上移|下移|调整顺序/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /删除/ })).toHaveCount(0);
  });

  test('sends setVisitTime with 15-minute values and applies the returned candidate', async ({ page }) => {
    await page.goto(previewPath);

    const start = page.getByLabel('开始 大三巴牌坊', { exact: true });
    const end = page.getByLabel('结束 大三巴牌坊', { exact: true });
    await expect(start).toHaveAttribute('step', '900');
    await expect(end).toHaveAttribute('step', '900');

    await start.fill('10:15');
    await end.fill('11:15');
    await page.getByRole('button', { name: '应用大三巴牌坊时间' }).click();

    await expect(page.getByRole('status')).toContainText('时间修改已应用');
    await expect(start).toHaveValue('10:15');
    await expect(end).toHaveValue('11:15');

    const requests = await page.evaluate(() => (window as EditorTestWindow).__d03Requests ?? []);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      action: 'editDraft',
      command: {
        type: 'setVisitTime',
        start: '10:15',
        end: '11:15',
      },
    });
  });

  test('sends setTransportMode using date and destination POI ID', async ({ page }) => {
    await page.goto(previewPath);

    const mode = page.getByRole('combobox', {
      name: '到 澳门博物馆 的交通方式',
      exact: true,
    });
    await mode.selectOption('walk');
    await page.getByRole('button', { name: '应用澳门博物馆交通' }).click();

    await expect(page.getByRole('status')).toContainText('交通方式修改已应用');
    await expect(page.getByTestId('editor-leg-mode').nth(1)).toHaveText('步行');

    const requests = await page.evaluate(() => (window as EditorTestWindow).__d03Requests ?? []);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      action: 'editDraft',
      command: {
        type: 'setTransportMode',
        date: '2026-11-03',
        toPoiId: '22222222-2222-4222-8222-222222222222',
        mode: 'walk',
      },
    });
  });

  test('rejects invalid 15-minute input before calling the adapter', async ({ page }) => {
    await page.goto(previewPath);

    await page.getByLabel('开始 大三巴牌坊', { exact: true }).fill('10:07');
    await page.getByLabel('结束 大三巴牌坊', { exact: true }).fill('11:00');
    await page.getByRole('button', { name: '应用大三巴牌坊时间' }).click();

    await expect(page.getByRole('alert')).toContainText('15 分钟');
    const requests = await page.evaluate(() => (window as EditorTestWindow).__d03Requests ?? []);
    expect(requests).toHaveLength(0);
  });

  test('keeps the candidate unchanged when the adapter rejects', async ({ page }) => {
    await page.goto(`${previewPath}?scenario=adapter-error`);

    const start = page.getByLabel('开始 大三巴牌坊', { exact: true });
    await start.fill('10:15');
    await page.getByLabel('结束 大三巴牌坊', { exact: true }).fill('11:15');
    await page.getByRole('button', { name: '应用大三巴牌坊时间' }).click();

    await expect(page.getByRole('alert')).toContainText('C adapter 暂不可用');
    await expect(start).toHaveValue('10:00');
  });

  test('keeps the editor usable at 320, 390 and 768 pixel widths', async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(previewPath);
      await expect(page.getByRole('heading', { level: 1, name: '编辑行程' })).toBeVisible();

      const layout = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    }
  });
});
