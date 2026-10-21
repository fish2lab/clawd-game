// Play the prologue start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest.mjs [screenshotDir]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
let pw;
try { pw = await import('playwright'); } catch (e) { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '?fast=1');
await page.waitForFunction(() => window.__probe);
await page.click('#go');
await page.waitForTimeout(800);

const RX = 11.2;
let n = 0;
const sleep = ms => page.waitForTimeout(ms);
const settle = async () => { await page.waitForFunction(() => window.__probe.settled(), null, { timeout: 15000 }); await sleep(250); };
const at = (x, y, z) => page.evaluate(([x, y, z]) => window.__probe.screen(x, y, z), [x, y, z]);
async function click(x, y, z, label) {
  await settle();
  const [sx, sy] = await at(x, y, z);
  const kind = await page.evaluate(([a, b]) => window.__probe.pickAt(a, b), [sx, sy]);
  await page.mouse.click(sx, sy);
  console.log(`  click ${label} @ ${Math.round(sx)},${Math.round(sy)} -> ${kind}`);
}
const until = (fn, label, ms) => page.waitForFunction(fn, null, { timeout: ms || 20000 }).then(() => console.log(`ok   ${label}`));
const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}-${name}.png`) }); };
const portrait = i => page.click(`#who .who:nth-child(${i})`);

try {
  // 1. out of the pod: wipe the frost, then the wheel
  await settle();
  const [cx, cy] = await at(1.5, 1.37, 1.76);
  await page.mouse.move(cx - 40, cy - 25);
  await page.mouse.down();
  for (let i = 0; i <= 24; i++) await page.mouse.move(cx - 40 + 80 * (i % 6) / 5, cy - 25 + 50 * Math.floor(i / 6) / 4);
  await page.mouse.up();
  await until(() => window.__probe.state().wiped >= 0.45, 'frost wiped');
  await shot('wiped');
  await click(1.5, 0.72, 1.83, 'Opus wheel');
  await until(() => window.__probe.state().opusOut, 'Opus out of the pod');
  await sleep(2500);
  await shot('lights');

  // 2. steam: main valve on, close B and C, open A
  await click(0.41, 0.95, 2.6, 'main valve');
  await until(() => window.__probe.state().main, 'main valve open');
  await click(0.56, 0.88, 3.6, 'valve B');
  await until(() => !window.__probe.valves().B, 'valve B closed');
  await click(0.76, 0.88, 4.1, 'valve C');
  await until(() => !window.__probe.valves().C, 'valve C closed');
  await click(0.36, 0.88, 3.1, 'valve A');
  await until(() => window.__probe.valves().A, 'valve A open');
  await until(() => window.__probe.state().thawed, 'Sonnet pod thawed', 15000);
  await shot('thawed');
  await click(3.85, 1.0, 1.42, 'Sonnet door');
  await until(() => window.__probe.state().sonnetFree, 'Sonnet out');
  await sleep(1200);
  await shot('sonnet');

  // 3. the wheel on the locker: crate west and back, north twice, west once; Opus up, Sonnet up
  await portrait(1);
  // against the wall the crate cannot go further, so the same click pulls it back
  await click(2.75, 0.45, 8.0, 'crate east face');
  await until(() => Math.abs(window.__probe.crate()[0] - 1.3) < 0.01, 'crate pushed west to the wall');
  await click(1.75, 0.45, 8.0, 'crate east face');
  await until(() => Math.abs(window.__probe.crate()[0] - 2.3) < 0.01, 'crate pulled back east');
  await click(2.3, 0.45, 8.45, 'crate south face');
  await until(() => Math.abs(window.__probe.crate()[1] - 7.0) < 0.01, 'crate pushed north');
  await click(2.3, 0.45, 7.45, 'crate south face');
  await until(() => Math.abs(window.__probe.crate()[1] - 6.0) < 0.01, 'crate pushed north again');
  await click(2.75, 0.45, 6.0, 'crate east face');
  await until(() => Math.abs(window.__probe.crate()[0] - 1.3) < 0.01, 'crate pushed west');
  await click(1.3, 0.9, 6.0, 'crate top');
  await until(() => window.__probe.actor('opus').support === 'crate', 'Opus on the crate');
  await portrait(2);
  await click(1.3, 1.74, 6.0, 'Opus head');
  await until(() => window.__probe.actor('sonnet').support === 'actor', 'Sonnet on Opus');
  await shot('stack-locker');
  await click(0.35, 2.25, 5.85, 'wheel on the locker');
  await until(() => window.__probe.state().wheelTaken, 'wheel taken');

  // 4. Haiku's pod
  await click(5.85, 0.62, 1.12, 'Haiku door');
  await until(() => window.__probe.state().wheelOn, 'wheel fitted');
  await click(5.85, 0.62, 1.12, 'Haiku door');
  await until(() => window.__probe.state().haikuFree, 'Haiku out', 25000);
  await sleep(800);
  await shot('haiku');

  // 5. the stack on the plinth
  await portrait(1);
  await page.waitForFunction(() => !window.__probe.actor('opus').busy);
  await click(RX, 0.57, 4.12, 'plinth (Opus)');
  await until(() => { const a = window.__probe.actor('opus'); return Math.abs(a.x - 11.2) < 0.2 && a.y > 0.5 && !a.busy; }, 'Opus on the plinth');
  await portrait(2);
  await click(RX, 0.56 + 0.83, 4.1, 'Opus head');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus');
  await portrait(3);
  await click(RX + 1.4, 0.57, 4.12, 'plinth (Haiku)');
  await until(() => { const a = window.__probe.actor('haiku'); return a.y > 0.5 && !a.busy; }, 'Haiku on the plinth');
  await click(RX, 0.56 + 0.83 + 0.65, 4.1, 'Sonnet head');
  await until(() => window.__probe.actor('haiku').support === 'actor' && !window.__probe.actor('haiku').busy, 'Haiku on top');
  await shot('stack');
  await click(RX - 0.3, 2.95, 3.46, 'the glass');
  await until(() => window.__probe.state().ended, 'tapped the glass');
  await sleep(2600);
  await shot('eyes');
  await page.waitForSelector('#card:not([hidden])', { timeout: 20000 });
  console.log('ok   chapter card');
  await sleep(800);
  await shot('card');
} catch (e) {
  console.error('FAILED:', e.message.split('\n')[0]);
  console.error('state:', JSON.stringify(await page.evaluate(() => window.__probe && window.__probe.state())));
  for (const a of ['opus', 'sonnet', 'haiku']) console.error(a, JSON.stringify(await page.evaluate(n => window.__probe.actor(n), a)));
  console.error('debug:', JSON.stringify(await page.evaluate(() => window.__probe.debug())));
  await page.waitForTimeout(2000);
  console.error('debug 2s later:', JSON.stringify(await page.evaluate(() => window.__probe.debug())));
  await shot('failed');
  process.exitCode = 1;
}
if (errors.length) { console.error('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
await browser.close();
