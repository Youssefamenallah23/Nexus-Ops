import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

// Runs against the real local API with the public seeded demo account.
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
try {
  for (const host of ['127.0.0.1', 'localhost']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const buttonWarnings = [];
    page.on('console', message => {
      if (message.text().includes('Base UI:') && message.text().includes('nativeButton')) {
        buttonWarnings.push(message.text());
      }
    });
    page.on('requestfailed', request => console.log(host, request.url(), request.failure()?.errorText));
    await page.goto(`http://${host}:3000/login`, { waitUntil: 'networkidle0' });
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/auth/login') && response.request().method() === 'POST');
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    assert.equal(response.status(), 200, `${host} real login`);
    assert.equal(new URL(response.url()).hostname, host, 'API and frontend use matching hosts');
    await page.waitForFunction(() => location.pathname.startsWith('/app'));
    const session = await page.evaluate(async api => {
      const response = await fetch(`${api}/auth/me`, { credentials: 'include' });
      return { status: response.status, role: response.ok ? (await response.json()).role : null };
    }, `http://${host}:8000`);
    assert.equal(session.status, 200, `${host} session cookie persists`);
    assert.equal(session.role, 'administrator');
    await page.waitForSelector('a[data-slot="button"][href="/app/analytics"]');
    assert.notEqual(await page.$eval('a[data-slot="button"][href="/app/analytics"]', element => element.getAttribute('role')), 'button', 'Simulator retains link semantics');
    await page.focus('a[data-slot="button"][href="/app/analytics"]');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname === '/app/analytics');
    assert.deepEqual(buttonWarnings, [], `${host} no native-button warnings`);
    console.log(`PASS ${host}: real login, session persistence, simulator keyboard navigation, no native-button warnings`);
    await context.close();
  }
} finally { await browser.close(); }


