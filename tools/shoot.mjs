// Render keyframes to PNG with headless Chromium.
//   node tools/shoot.mjs [outDir] [id ...]
// Frames are drawn by keyframes.html?frame=<id>, the same code the board uses.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.resolve(process.argv[2] || path.join(root, 'docs/keyframes'));
const only = process.argv.slice(3);
const W = Number(process.env.KF_W || 1920), H = Number(process.env.KF_H || 1080);
fs.mkdirSync(outDir, { recursive: true });

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));

const base = pathToFileURL(path.join(root, 'keyframes.html')).href;
await page.goto(`${base}?list=1`);
await page.waitForFunction(() => window.__frameIds);
const ids = only.length ? only : await page.evaluate(() => window.__frameIds);

for (const id of ids) {
  await page.goto(`${base}?frame=${encodeURIComponent(id)}&w=${W}&h=${H}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const file = path.join(outDir, `${id}.png`);
  await page.locator('canvas#shot').screenshot({ path: file });
  console.log('wrote', path.relative(root, file));
}
await browser.close();

// Prefer a local install; fall back to the global one (npm root -g).
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) {
    const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
    return req('playwright');
  }
}
