import { test, expect, type Page } from '@playwright/test';
import fixtures from './pois.synthetic.json' with { type: 'json' };
const tripId = 'c0000000-0000-4000-8000-000000000001';
const otherId = 'c0000000-0000-4000-8000-000000000002';
const poiId = fixtures[0]!.id;
const key = 'tripmate.activeTripId';
const trip = (id = tripId) => ({ id, title: id === tripId ? '测试旅行A' : '测试旅行B', startDate: '2026-11-10', endDate: '2026-11-10', origin: { label: '测试出发点', position: { lat: 22.19, lng: 113.54 }, source: 'curated' }, dayWindows: [{ date: '2026-11-10', start: '09:00', end: '18:00' }], interests: ['history'], budget: null, pace: 'standard' });
const entry = `/#/pois/${poiId}`;
async function prepare(page: Page, saved = true) {
  if (saved) await page.addInitScript(({ key, tripId }) => localStorage.setItem(key, tripId), { key, tripId });
  await page.route('**/api/v1/health', r => r.fulfill({ json: { data: { status: 'ok', database: 'ok' } } }));
  await page.route('**/api/v1/pois/**', r => r.fulfill({ json: { data: fixtures.find(p => p.id === new URL(r.request().url()).pathname.split('/').at(-1)) } }));
  await page.route('**/api/v1/trips/*', r => r.fulfill({ json: { data: trip(new URL(r.request().url()).pathname.split('/').at(-1)) } }));
}
test('read/add/reload/remove use authoritative targets and never write favorites', async ({ page }) => {
  await prepare(page); let ids: string[] = []; const writes: string[] = [];
  page.on('request', r => { if (r.method() !== 'GET') writes.push(r.url()); });
  await page.route('**/api/v1/trips/*/targets**', async r => {
    if (r.request().method() === 'POST') { expect(r.request().postDataJSON()).toEqual({ poiId }); ids = [poiId]; }
    if (r.request().method() === 'DELETE') ids = [];
    await r.fulfill({ status: r.request().method() === 'POST' ? 201 : 200, json: { data: { tripId, poiIds: ids } } });
  });
  await page.goto(entry); await page.getByRole('button', { name: '加入当前旅行', exact: true }).click();
  await expect(page.getByRole('button', { name: '从当前旅行移除' })).toBeEnabled();
  await page.reload(); await expect(page.getByLabel('当前旅行目标')).toContainText('第 1 个');
  await page.getByRole('button', { name: '从当前旅行移除' }).click();
  await expect(page.getByLabel('当前旅行目标')).toContainText('已选 0 个地点');
  expect(writes).toHaveLength(2); expect(writes.every(url => url.includes('/targets'))).toBe(true);
  for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
});
test('no active Trip makes no target requests; unregistered target API is explicit', async ({ page }) => {
  await prepare(page, false); let calls = 0;
  await page.route('**/api/v1/trips/*/targets', r => { calls++; return r.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } }); });
  await page.goto(entry); await expect(page.getByRole('link', { name: '设置当前旅行' })).toBeVisible(); expect(calls).toBe(0);
  await page.evaluate(({ key, tripId }) => localStorage.setItem(key, tripId), { key, tripId }); await page.reload();
  await expect(page.getByLabel('当前旅行目标').getByRole('alert')).toContainText('服务或旅行不可用');
  await expect(page.getByRole('button', { name: '加入当前旅行', exact: true })).toBeDisabled();
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(tripId);
});
test('duplicate refreshes from server; uncertain write requires reread before another mutation', async ({ page }) => {
  await prepare(page); let ids: string[] = [], fail = false;
  await page.route('**/api/v1/trips/*/targets**', async r => {
    if (r.request().method() === 'POST') { ids = [poiId]; return r.fulfill({ status: 409, json: { error: { code: 'DUPLICATE_TARGET' } } }); }
    if (r.request().method() === 'DELETE') { fail = true; return r.fulfill({ status: 503, json: { error: { code: 'STORAGE_UNAVAILABLE' } } }); }
    return r.fulfill({ json: { data: { tripId, poiIds: ids } } });
  });
  await page.goto(entry); await page.getByRole('button', { name: '加入当前旅行', exact: true }).click();
  await expect(page.getByLabel('当前旅行目标')).toContainText('已经加入');
  await page.getByRole('button', { name: '从当前旅行移除' }).click();
  await expect(page.getByRole('alert')).toContainText('结果未确认'); expect(fail).toBe(true);
  await expect(page.getByRole('button', { name: '加入当前旅行', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '重新读取目标' }).click(); await expect(page.getByRole('button', { name: '从当前旅行移除' })).toBeEnabled();
});
test('POST 404 revalidates Trip; existing Trip is kept, deleted Trip is cleared', async ({ page }) => {
  await prepare(page); let missing = false;
  await page.route('**/api/v1/trips/*', r => r.fulfill(missing ? { status: 404, json: { error: { code: 'NOT_FOUND' } } } : { json: { data: trip() } }));
  await page.route('**/api/v1/trips/*/targets', r => r.fulfill(r.request().method() === 'POST' ? { status: 404, json: { error: { code: 'NOT_FOUND' } } } : { json: { data: { tripId, poiIds: [] } } }));
  await page.goto(entry); await page.getByRole('button', { name: '加入当前旅行', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('旅行仍然有效'); expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(tripId);
  missing = true; await page.getByRole('button', { name: '加入当前旅行', exact: true }).click();
  await expect(page.getByRole('link', { name: '设置当前旅行' })).toBeVisible(); expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
});
test('late target response from old Trip cannot overwrite newly saved Trip', async ({ page }) => {
  await prepare(page); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }); let started = false;
  await page.route('**/api/v1/trips/*/targets', async r => {
    const id = new URL(r.request().url()).pathname.split('/')[4]!;
    if (r.request().method() === 'POST') { started = true; await gate; await r.fulfill({ status: 201, json: { data: { tripId: id, poiIds: [poiId] } } }).catch(() => {}); }
    else await r.fulfill({ json: { data: { tripId: id, poiIds: [] } } });
  });
  await page.route('**/api/v1/origins', r => r.fulfill({ json: { data: { items: [{ id: 'test-origin', label: '测试出发点', position: { lat: 22.19, lng: 113.54 } }], total: 1 } } }));
  await page.route('**/api/v1/trips', r => r.fulfill(r.request().method() === 'POST' ? { status: 201, json: { data: trip(otherId) } } : { json: { data: { items: [], total: 0 } } }));
  await page.goto(entry); await page.getByRole('button', { name: '加入当前旅行', exact: true }).click(); await expect.poll(() => started).toBe(true);
  await page.locator('.active-trip a').click(); await page.getByRole('button', { name: '新建旅行', exact: true }).click();
  await page.getByLabel('旅行名称', { exact: true }).fill('测试旅行B');
  await page.getByLabel('开始日期', { exact: true }).fill('2026-11-10'); await page.getByLabel('结束日期', { exact: true }).fill('2026-11-10'); await page.getByLabel('结束日期', { exact: true }).blur();
  await page.getByLabel('开始 2026-11-10', { exact: true }).fill('09:00'); await page.getByLabel('结束 2026-11-10', { exact: true }).fill('18:00');
  await page.getByLabel('澳门出发点', { exact: true }).selectOption({ index: 1 }); await page.getByRole('button', { name: '保存旅行', exact: true }).click();
  await expect(page.getByLabel('当前旅行')).toContainText('测试旅行B');
  await page.evaluate(id => { location.hash = `/pois/${id}`; }, poiId);
  await expect(page.getByLabel('当前旅行目标')).toContainText('已选 0 个地点'); release();
  await expect(page.getByRole('button', { name: '加入当前旅行', exact: true })).toBeEnabled();
  await expect(page.getByLabel('当前旅行目标')).not.toContainText('第 1 个');
});
