import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => {
    window.__sceneDraws = 0;
    const names = new WeakMap();
    for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!type) continue;
      const locate = type.prototype.getUniformLocation;
      type.prototype.getUniformLocation = function (program, name) {
        const location = locate.call(this, program, name);
        if (location) names.set(location, name);
        return location;
      };
      const matrix = type.prototype.uniformMatrix4fv;
      type.prototype.uniformMatrix4fv = function (location, transpose, value, ...args) {
        if (names.get(location) === 'modelViewMatrix') window.__sceneView = Array.from(value);
        return matrix.call(this, location, transpose, value, ...args);
      };
      for (const method of ['drawElements', 'drawArrays']) {
        const original = type.prototype[method];
        type.prototype[method] = function (...args) { window.__sceneDraws++; return original.apply(this, args); };
      }
    }
  });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__sceneView && window.__sceneDraws > 0);
  await wait(1500);
  const idle = await page.evaluate(() => window.__sceneDraws);
  await wait(650);
  assert.equal(await page.evaluate(() => window.__sceneDraws), idle, 'Idle scene does not continuously render');
  const view = () => page.evaluate(() => window.__sceneView);
  const initial = await view();
  const box = await (await page.$('.core-canvas canvas')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 110, box.y + box.height / 2 - 20, { steps: 10 });
  await page.mouse.up();
  await wait(1300);
  assert.notDeepEqual(await view(), initial, 'Dragging rotates the view');
  await page.focus('.core-canvas');
  await page.keyboard.press('Home');
  await wait(1300);
  const reset = await view();
  await page.keyboard.press('ArrowRight');
  await wait(1300);
  assert.notDeepEqual(await view(), reset, 'Keyboard rotation changes the view');
  await page.keyboard.press('Home');
  await wait(1300);
  const beforeScroll = await view();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel({ deltaY: 90 });
  await wait(650);
  assert.ok(await page.evaluate(() => scrollY > 0), 'Wheel over canvas scrolls the page');
  assert.equal(await page.$eval('.hero-object', element => getComputedStyle(element).transform), 'none', 'Scroll does not transform the canvas');
  const cameraDistance = matrix => Math.hypot(...matrix.slice(12, 15));
  assert.ok(Math.abs(cameraDistance(await view()) - cameraDistance(beforeScroll)) < 0.00001, 'Scrolling does not zoom the camera');
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('button[aria-label="Start auto-rotation"]').click();
  const spinning = await page.evaluate(() => window.__sceneDraws);
  await wait(650);
  assert.ok(await page.evaluate(() => window.__sceneDraws) > spinning, 'Optional auto-rotation animates');
  await page.evaluate(() => scrollTo(0, 1200));
  await wait(800);
  const hidden = await page.evaluate(() => window.__sceneDraws);
  await wait(650);
  assert.equal(await page.evaluate(() => window.__sceneDraws), hidden, 'Off-screen auto-rotation stops drawing');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => scrollTo(0, 0));
  await wait(800);
  const reduced = await page.evaluate(() => window.__sceneDraws);
  await wait(650);
  assert.equal(await page.evaluate(() => window.__sceneDraws), reduced, 'Reduced motion stops automatic animation');
  assert.equal(await page.$eval('.hero-bottom button', element => element.disabled), true);
  console.log('PASS: idle demand rendering, drag, keyboard, reset, no scroll zoom, optional rotation, off-screen stop, reduced motion.');
} finally { await browser.close(); }
