// Drive one chapter in headless Chromium with real mouse clicks, for the playthrough tests.
//
//   import { drive } from './lib/drive.mjs';
//   await drive('ch1', async d => {
//     await d.click(x, y, z, 'label');          // click the screen point of a world point
//     await d.until(() => window.__probe.state().done, 'label');
//   });
//
// Runs at half resolution with big time steps (?fast=1) because software GL is slow.
// A screenshot directory can be passed as the first CLI argument.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function drive(chapter, script, opt = {}) {
  const shots = process.argv[2];
  if (shots) fs.mkdirSync(shots, { recursive: true });
  let pw;
  try { pw = await import('playwright'); } catch (e) { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: opt.width || 1280, height: opt.height || 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href + `?fast=1&ch=${chapter}`);
  await page.waitForFunction(() => document.readyState === 'complete');
  if (chapter === 'prologue') {
    await page.waitForFunction(() => window.__probe);
    await page.click('#go');
  } else {
    await page.waitForSelector('#card-go:not([hidden])', { timeout: 30000 });
    await page.click('#card-go');
    await page.waitForFunction(ch => window.__probe && window.__probe.chapter() === ch, chapter, { timeout: 60000 });
  }
  await page.waitForTimeout(800);

  let n = 0;
  const sleep = ms => page.waitForTimeout(ms);
  const settle = async () => { await page.waitForFunction(() => window.__probe.settled(), null, { timeout: 15000 }); await sleep(250); };
  const at = (x, y, z) => page.evaluate(([x, y, z]) => window.__probe.screen(x, y, z), [x, y, z]);
  const d = {
    page, sleep, settle, at,
    // click the screen point of world point (x, y, z); logs what the pick ray hits there
    async click(x, y, z, label) {
      await settle();
      const [sx, sy] = await at(x, y, z);
      const kind = await page.evaluate(([a, b]) => window.__probe.pickAt(a, b), [sx, sy]);
      await page.mouse.click(sx, sy);
      console.log(`  click ${label} @ ${Math.round(sx)},${Math.round(sy)} -> ${kind}`);
    },
    // drag through a list of world points
    async drag(pts, label) {
      await settle();
      const sp = [];
      for (const p of pts) sp.push(await at(...p));
      await page.mouse.move(sp[0][0], sp[0][1]);
      await page.mouse.down();
      for (const [x, y] of sp.slice(1)) await page.mouse.move(x, y, { steps: 4 });
      await page.mouse.up();
      console.log(`  drag ${label}`);
    },
    until: (fn, label, ms, arg) => page.waitForFunction(fn, arg, { timeout: ms || 20000 }).then(() => console.log(`ok   ${label}`)),
    shot: async name => { if (shots) await page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}-${name}.png`) }); },
    // select the i-th portrait (1-based, in the order the chapter lists its actors)
    portrait: i => page.click(`#who .who:nth-child(${i})`),
    key: k => page.keyboard.press(k),
  };

  try {
    await script(d);
  } catch (e) {
    console.error('FAILED:', e.message.split('\n')[0]);
    try {
      console.error('state:', JSON.stringify(await page.evaluate(() => window.__probe && window.__probe.state())));
      for (const a of ['opus', 'sonnet', 'haiku']) console.error(a, JSON.stringify(await page.evaluate(n => window.__game.A[n] ? window.__probe.actor(n) : null, a)));
      console.error('debug:', JSON.stringify(await page.evaluate(() => window.__probe.debug())));
    } catch (e2) { /* page gone */ }
    await d.shot('failed');
    process.exitCode = 1;
  }
  if (errors.length) { console.error('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
  await browser.close();
}
