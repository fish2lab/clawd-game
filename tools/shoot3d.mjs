// Screenshot posed stills of the diorama: node tools/shoot3d.mjs outDir look [look ...]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outDir, ...looks] = process.argv.slice(2);
const W = Number(process.env.KF_W || 1600), H = Number(process.env.KF_H || 900);
fs.mkdirSync(outDir, { recursive: true });
let pw;
try { pw = await import('playwright'); } catch (e) { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 300)); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
const base = pathToFileURL(path.join(root, 'index.html')).href;
for (const look of looks) {
  await page.goto(`${base}?look=${look}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const file = path.join(outDir, `${look}.png`);
  await page.screenshot({ path: file });
  console.log('wrote', file);
}
await browser.close();
