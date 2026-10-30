import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// API fixtures stay inside this browser. No live records or model calls are changed.
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const user = { id: 'qa-user', name: 'Demo Manager', email: 'admin@nexus.test', role: 'administrator', department: 'Administration' };
const initial = { id: 'qa-document', filename: 'supplier-quote.txt', mime_type: 'text/plain', size_bytes: 300, status: 'needs_review', doc_type: 'supplier_quote', department: 'Administration', uploaded_by: user.id, uploaded_at: '2026-10-30T10:00:00Z', uploader_name: user.name, project_name: null, missing_fields: [], latest_confidence: .9, classification_confidence: .9, text_content: 'SUPPLIER QUOTE. Example Grid Services. Total: 1500 EUR. Reference: DEMO-QUOTE-001.', reviewer_name: null, original_file_available: true, qa_issues: ['Check the extracted fields against the source.'], qa_ok: false, extractions: [{ revision: 1, data: { supplier: 'Example Grid Services', reference: 'DEMO-QUOTE-001', amount: 1500, currency: 'EUR', due_date: '2030-12-01', summary: 'Initial extracted summary' }, missing_fields: [], confidence: .9, created_by: 'ai', created_at: '2026-10-30T10:00:00Z' }] };
let document = structuredClone(initial), failList = true, failQuestion = true, approvals = 0;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/nativeButton|Could not validate that a segment/.test(message.text())) errors.push(message.text()); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.port !== '8000') return request.continue();
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS,PATCH' };
    const respond = (body, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
    if (url.pathname === '/auth/me') return respond(user);
    if (url.pathname === '/documents' && request.method() === 'GET') {
      if (failList) return respond({ detail: 'Temporary source list failure' }, 503);
      return respond([document]);
    }
    if (url.pathname === '/documents' && request.method() === 'POST') return respond(document);
    if (url.pathname === '/documents/qa-document') return respond(document);
    if (url.pathname.endsWith('/extraction')) {
      document.extractions.push({ ...document.extractions.at(-1), revision: 2, data: JSON.parse(request.postData()).data, confidence: 1, created_by: user.id });
      return respond(document);
    }
    if (url.pathname.endsWith('/approve')) { approvals++; document.status = 'approved'; return respond({ ok: true, task_department: 'Administration' }); }
    if (url.pathname.endsWith('/reject')) { document.status = 'rejected'; return respond({ ok: true }); }
    if (url.pathname === '/copilot/reindex') return respond({ documents: 1, chunks: 2 });
    if (url.pathname === '/copilot/ask') {
      if (failQuestion) { failQuestion = false; return respond({ detail: 'Embedding provider unavailable. Try again.' }, 503); }
      await new Promise(resolve => setTimeout(resolve, 300));
      return respond({ answer: 'Example Grid Services supplied the quote [1].', citations: [{ document_id: document.id, filename: document.filename, doc_type: document.doc_type, chunk_index: 0, excerpt: document.text_content, score: .9 }], provider: 'extractive', supported: true, fallback: true });
    }
    return respond([]);
  });
  async function clickText(text, scope = 'main') {
    for (const button of await page.$$(`${scope} button`)) {
      if (await button.evaluate((element, label) => element.textContent.trim() === label, text)) { await button.click(); return; }
    }
    throw new Error(`Button not found: ${text}`);
  }
  await page.goto('http://127.0.0.1:3000/app/documents', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.body.innerText.includes('Documents could not be loaded'));
  failList = false;
  await clickText('Try again');
  await page.waitForSelector('a[href="/app/documents/qa-document"]');
  await clickText('Upload');
  await page.waitForSelector('input[type="file"]');
  await (await page.$('input[type="file"]')).uploadFile(fileURLToPath(new URL('../../examples/supplier-quote.txt', import.meta.url)));
  await clickText('Start Pipeline Run', 'body');
  await page.waitForFunction(() => location.pathname === '/app/documents/qa-document');
  await page.waitForSelector('#field-summary');
  await page.locator('#field-summary').fill('Human corrected summary');
  assert.equal(await page.$$eval('main button', buttons => buttons.find(button => button.textContent.includes('Approve and create task')).disabled), true, 'Unsaved corrections block approval');
  await clickText('Save corrections');
  await page.waitForFunction(() => !document.body.innerText.includes('Unsaved corrections'));
  assert.equal(document.extractions.at(-1).data.summary, 'Human corrected summary');
  await clickText('Approve and create task');
  await page.waitForFunction(() => document.body.innerText.includes('Approved. Your task is ready.'));
  assert.equal(approvals, 1);
  await page.click('main a[href="/app/tasks"]');
  await page.waitForFunction(() => location.pathname === '/app/tasks');
  document = structuredClone(initial);
  await page.goto('http://127.0.0.1:3000/app/documents/qa-document', { waitUntil: 'networkidle0' });
  await clickText('Reject');
  await page.waitForFunction(() => document.body.innerText.includes('Approval automation was not dispatched.'));
  assert.equal(approvals, 1, 'Reject does not call approval');
  await page.goto('http://127.0.0.1:3000/app/copilot', { waitUntil: 'networkidle0' });
  await page.locator('#copilot-question').fill('What does the supplier quote say?');
  await clickText('Ask');
  await page.waitForFunction(() => document.body.innerText.includes('The request did not complete'));
  assert.equal(await page.$eval('#copilot-question', input => input.value), 'What does the supplier quote say?', 'Failed question stays in the input');
  await clickText('Ask');
  await page.waitForFunction(() => document.body.innerText.includes('Showing matching source sentences instead.'));
  assert.equal(await page.$eval('main a[href="/app/documents/qa-document"]', link => link.textContent.includes('[1]')), true, 'Fallback keeps source links');
  await clickText('Rebuild source index');
  await page.waitForFunction(() => document.body.innerText.includes('Indexed 1 approved documents into 2 source excerpts.'));
  await page.setViewport({ width: 375, height: 812 });
  await page.click('[data-slot="sidebar-trigger"]');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
  await clickText('Run demo', '#live-simulator');
  await page.waitForSelector('#live-simulator button', { visible: true });
  await page.waitForFunction(() => document.querySelector('#live-simulator').innerText.includes('Human Sign-off Required'));
  await clickText('Reject sample', '#live-simulator');
  await page.waitForFunction(() => document.querySelector('#live-simulator').innerText.includes('Sample rejected'));
  assert.deepEqual(errors, []);
  console.log('PASS: list retry, upload-to-review, summary correction, save-before-approve, task handoff, rejection, copilot retry/citations/index, local rejection, no instant/button warnings.');
} finally { await browser.close(); }
