import { test, expect, type Page } from '@playwright/test';
import fixtures from './pois.synthetic.json' with { type: 'json' };
const id = fixtures[0]!.id;
const detail = `/#/pois/${id}`;
async function prepare(page: Page, saved: Set<string>) {
  await page.route('**/api/v1/health', r => r.fulfill({ json: { data: { status: 'ok', database: 'ok' } } }));
  await page.route('**/api/v1/pois**', r => {
    const u = new URL(r.request().url());
    if (u.pathname !== '/api/v1/pois') return r.fulfill({ json: { data: fixtures.find(p => p.id === u.pathname.split('/').at(-1)) } });
    const items = fixtures.filter(p => (u.searchParams.get('favoriteOnly') !== 'true' || saved.has(p.id)) && (!u.searchParams.get('category') || p.category === u.searchParams.get('category')) && (!u.searchParams.get('search') || p.name.toLowerCase().includes(u.searchParams.get('search')!.toLowerCase())));
    return r.fulfill({ json: { data: { items, total: items.length } } });
  });
  await page.route('**/api/v1/favorites/*', r => {
    const poiId = new URL(r.request().url()).pathname.split('/').at(-1)!;
    if (r.request().method() === 'PUT') { expect(r.request().postDataJSON()).toEqual({}); saved.add(poiId); }
    if (r.request().method() === 'DELETE') { expect(r.request().postData()).toBeNull(); saved.delete(poiId); }
    return r.fulfill({ json: { data: { poiId, favorited: saved.has(poiId) } } });
  });
}
test('favorite without active Trip persists across reload; list uses favoriteOnly with no per-card GET', async ({ page }) => {
  const saved = new Set<string>(); await prepare(page, saved);
  const writes: string[] = []; page.on('request', r => { if (r.method() !== 'GET') writes.push(r.url()); });
  await page.goto(detail); await page.getByRole('button', { name: `收藏此地点：${fixtures[0]!.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `取消收藏：${fixtures[0]!.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await expect(page.getByRole('button', { name: '取消收藏', exact: false })).toBeEnabled();
  let reads = 0; page.on('request', r => { if (r.method() === 'GET' && r.url().includes('/favorites/')) reads++; });
  const listRequest = page.waitForRequest(r => r.url().includes('/pois?favoriteOnly=true'));
  await page.evaluate(() => { location.hash = '/favorites'; }); await listRequest;
  await expect(page.getByText('1 个地点')).toBeVisible(); expect(reads).toBe(0);
  await page.getByRole('button', { name: '取消收藏', exact: false }).click();
  await expect(page.getByRole('heading', { name: '没有匹配的收藏地点' })).toBeVisible();
  expect(writes).toHaveLength(2); expect(writes.every(url => url.includes('/favorites/'))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('tripmate.activeTripId'))).toBeNull();
});
test('favorite category/search survive details, refresh and Back; narrow layouts fit', async ({ page }) => {
  await prepare(page, new Set([id, fixtures[1]!.id]));
  await page.goto('/#/favorites'); await page.getByRole('searchbox').fill('alpha');
  await page.getByRole('button', { name: '⌂ 历史', exact: true }).click();
  await expect(page.getByText('1 个地点')).toBeVisible(); await page.getByRole('link', { name: '查看详情' }).click();
  await page.reload(); await page.getByRole('link', { name: '← 返回收藏列表' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('alpha');
  await expect(page.getByRole('button', { name: '⌂ 历史', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.screenshot({ path: test.info().outputPath('favorites-list.png') });
});
test('unregistered API and failed writes require state reread, not optimistic success', async ({ page }) => {
  const saved = new Set<string>(); await prepare(page, saved);
  await page.route('**/api/v1/favorites/*', r => r.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND' } } }));
  await page.goto(detail); await expect(page.getByRole('alert')).toContainText('暂不可用');
  await expect(page.getByRole('button', { name: '收藏此地点', exact: false })).toBeDisabled();
  await page.unroute('**/api/v1/favorites/*');
  await page.route('**/api/v1/favorites/*', r => r.fulfill(r.request().method() === 'GET' ? { json: { data: { poiId: id, favorited: false } } } : { status: 503, json: { error: { message: 'PRIVATE SQL' } } }));
  await page.getByRole('button', { name: '重新读取收藏状态' }).click();
  await page.getByRole('button', { name: '收藏此地点', exact: false }).click();
  await expect(page.getByRole('alert')).toContainText('结果未确认'); await expect(page.getByRole('button', { name: '收藏此地点', exact: false })).toBeDisabled();
  expect(saved.size).toBe(0); await expect(page.getByRole('alert')).not.toContainText('PRIVATE');
});
test('old detail response cannot overwrite a different POI; rapid clicks submit once', async ({ page }) => {
  const saved = new Set<string>(); await prepare(page, saved); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/api/v1/favorites/${id}`, async r => { await gate; await r.fulfill({ json: { data: { poiId: id, favorited: true } } }).catch(() => {}); });
  await page.goto(detail); await expect(page.getByRole('heading', { name: fixtures[0]!.name })).toBeVisible();
  await page.evaluate(id => { location.hash = `/pois/${id}`; }, fixtures[1]!.id);
  await expect(page.getByRole('button', { name: `收藏此地点：${fixtures[1]!.name}` })).toBeEnabled(); release();
  let writes = 0;
  await page.route(`**/api/v1/favorites/${fixtures[1]!.id}`, async r => { writes++; await new Promise(resolve => setTimeout(resolve, 100)); await r.fulfill({ json: { data: { poiId: fixtures[1]!.id, favorited: true } } }); });
  await page.getByRole('button', { name: `收藏此地点：${fixtures[1]!.name}` }).evaluate((el: HTMLButtonElement) => { el.click(); el.click(); });
  await expect(page.getByRole('button', { name: `取消收藏：${fixtures[1]!.name}` })).toBeEnabled(); expect(writes).toBe(1);
});
