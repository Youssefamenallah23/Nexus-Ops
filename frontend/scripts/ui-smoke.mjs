import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Browser-only fixtures verify UI routes without modifying app authentication or backend data.
const out = new URL('../../.hallmark/qa/', import.meta.url);
await mkdir(out, { recursive: true });
const user = { id: 'qa-user', name: 'Claire Moreau', email: 'admin@nexus.test', role: 'administrator', department: 'Operations' };
const document = { id: 'qa-document', filename: 'Transformer_quote.pdf', mime_type: 'application/pdf', size_bytes: 1400000, status: 'needs_review', doc_type: 'supplier_quote', classification_confidence: .96, department: 'Grid Infrastructure', uploaded_by: user.id, uploaded_at: '2026-10-30T10:00:00Z', uploader_name: user.name, project_name: 'Grid maintenance', missing_fields: [], latest_confidence: .96, text_content: 'Synthetic browser verification record', extractions: [{ revision: 1, data: { supplier: 'Example supplier', amount: 42850, currency: 'USD' }, missing_fields: [], confidence: .96, created_by: 'agent', created_at: '2026-10-30T10:00:00Z' }], reviewer_name: null };
const analytics = { documents: { total: 22, by_status: { needs_review: 4, approved: 18 }, by_type: { supplier_quote: 12, intervention_report: 10 }, pending_review: 4, straight_through_rate: .82 }, tasks: { by_status: { completed: 14 }, overdue: 2 }, automation: { ai_processed: 22, manual_corrections: 3 }, time_saved_simulator: { disclaimer: 'Synthetic browser QA projection', manual_minutes: 12, assisted_minutes: 3, annual_volume: 1000, estimated_hours_saved: 150, formula: '((12 - 3) × 1000) / 60' } };
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', request => {
  const url = new URL(request.url());
  if (url.port !== '8000') return request.continue();
  const headers = { 'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS,PATCH' };
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
  const payload = url.pathname === '/auth/me' ? user : url.pathname === '/analytics/overview' ? analytics : url.pathname === '/documents' ? [document] : url.pathname === '/documents/qa-document' ? document : url.pathname === '/observatory/summary' ? { by_agent: [], fallback_rate: 0, error_rate: 0, total_calls: 0 } : url.pathname === '/workflows/config' ? { n8n_configured: false, webhook_url: null, mock_mode: true } : [];
  return request.respond({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(payload) });
});
const results = [];
for (const width of [1440, 375]) {
  await page.setViewport({ width, height: width === 1440 ? 900 : 812 });
  for (const route of ['/', '/login', '/app', '/app/documents', '/app/documents/qa-document', '/app/copilot', '/app/observatory', '/app/workflows', '/app/tasks', '/app/analytics', '/app/audit', '/app/settings']) {
    const response = await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'networkidle0' });
    assert.equal(response.status(), 200, route);
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    const report = await page.evaluate(() => ({ title: document.querySelector('main h2, h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth, body: document.body.innerText.includes('Application error'), clippedControls: [...document.querySelectorAll('main button, main a, main input')].filter(element => {
      const box = element.getBoundingClientRect();
      if (!box.width || (box.left >= -1 && box.right <= innerWidth + 1)) return false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth) return false;
      }
      return true;
    }).map(element => element.textContent.trim() || element.getAttribute('aria-label') || element.tagName) }));
    assert.equal(report.overflow, false, `${width} ${route} overflow`);
    assert.equal(report.body, false, `${route} error boundary`);
    assert.deepEqual(report.clippedControls, [], `${width} ${route} clipped controls`);
    const name = `${route === '/' ? 'landing' : route.replaceAll('/', '-').slice(1)}-${width}.png`;
    await page.screenshot({ path: new URL(name, out).pathname.replace(/^\/(?=[A-Z]:)/i, ''), fullPage: route === '/' });
    results.push({ width, route, ...report });
    if (route === '/app/documents') {
      const filters = await page.$$('main button');
      for (const filter of filters) {
        if (await filter.evaluate(element => element.textContent.trim() === 'All')) { await filter.click(); break; }
      }
      assert.equal(await page.$eval('main', element => element.innerText.includes('Transformer_quote.pdf')), true, 'Selecting active filter keeps records visible');
    }
  }
}
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
await page.locator('button[aria-label="Start auto-rotation"]').click();
assert.equal(await page.$eval('button[aria-label="Pause auto-rotation"]', element => element.getAttribute('aria-pressed')), 'true');
await page.locator('#live-simulator button').filter(button => button.textContent.trim() === 'Run demo').click();
await page.waitForFunction(() => document.querySelector('#live-simulator')?.innerText.includes('Awaiting sign-off'), { timeout: 12000 });
const approval = await page.$$('button');
let approved = false;
for (const button of approval) { const text = await button.evaluate(e => e.textContent); if (/Authorize|Approve/.test(text)) { await button.click(); approved = true; break; } }
assert.equal(approved, true, 'Human approval button exists');
await page.waitForFunction(() => document.querySelector('#live-simulator')?.innerText.includes('Dispatched'), { timeout: 6000 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.reload({ waitUntil: 'networkidle0' });
assert.equal(await page.$eval('[data-hero-enter]', element => getComputedStyle(element).opacity), '1');
assert.deepEqual(errors, []);
await writeFile(new URL('results.json', out), JSON.stringify({ routes: results, checks: ['24 route/viewport renders', '3D pause control', 'simulation pauses for human approval', 'approval dispatch completes', 'reduced-motion hero visible', 'no uncaught browser errors'], errors }, null, 2));
console.log('PASS: 24 route/viewport renders; pause, approval, dispatch and reduced motion; no uncaught browser errors.');
} finally {
  await browser.close();
}
