// Play the epilogue start to finish with real mouse clicks, in headless Chromium,
// taking some of the wrong routes on the way.
//   node tools/playtest-epilogue.mjs [screenshotDir]
import { drive } from './lib/drive.mjs';

const CRANK = [5.0, 6.1, 8.0];
const H = { opus: 0.8333, sonnet: 0.65, haiku: 0.4667 };   // heights (moves the click to the top of a head)

await drive('epilogue', async ({ page, click, until, sleep, shot, portrait, settle, at }) => {
  const st = () => page.evaluate(() => window.__probe.state());
  const fab = () => page.evaluate(() => window.__probe.fable());
  const actor = n => page.evaluate(n => window.__probe.actor(n), n);
  const idle = n => until(n => { const a = window.__probe.actor(n); return !a.busy; }, `${n} idle`, 30000, n);
  const head = async (n, label) => { const a = await actor(n); await click(a.x, a.y + H[n] - 0.02, a.z, label || `${n} head`); };
  // knock n times on Fable's front, as fast as the clicks go (the knocks queue up)
  async function knocks(n) {
    await settle();
    const f = await fab();
    const [x, y] = await at(f.x - 0.5, 1.5, f.z + 1.49);
    for (let i = 0; i < n; i++) { await page.mouse.click(x, y); await sleep(120); }
    console.log(`  knock x${n}`);
  }
  async function message(groups, label) {
    for (let g = 0; g < groups.length; g++) {
      const before = (await st()).groups.length;
      await knocks(groups[g]);
      if (g < groups.length - 1 || label !== 'H I') await until(b => window.__probe.state().groups.length > b || window.__probe.state().phase !== 'hi', `group of ${groups[g]} closed`, 30000, before);
    }
  }

  await sleep(2500);
  await shot('start');

  // 1. a wrong route first: Opus walks up to Fable, which growls at it
  await portrait(1);
  const f0 = await fab();
  await click(f0.x + 1.2, 2.0, f0.z + 1.49, 'Fable (as Opus)');
  await until(() => window.__probe.state().growls >= 1, 'Fable growls at Opus');
  await idle('opus');

  // Haiku to Fable's feet
  await portrait(3);
  const [kx, kz] = await page.evaluate(() => window.__probe.knockSpot());
  await click(kx, 0.01, kz, 'the floor in front of Fable');
  await until(([x, z]) => { const a = window.__probe.actor('haiku'); return !a.busy && Math.hypot(a.x - x, a.z - z) < 0.2; }, 'Haiku at Fable\'s feet', 30000, [kx, kz]);

  // wrong: row and column swapped (3, 2 = M; 4, 2 = R)
  await message([3, 2, 4, 2], 'M R');
  await until(() => window.__probe.state().wrong >= 1, 'M R: Fable tilts its head');
  await until(() => { const s = window.__probe.state(); return !s.judging && s.groups.length === 0; }, 'chalk wiped', 20000);
  await shot('wrong');

  // H I = 2, 3 · 2, 4
  await message([2, 3, 2, 4], 'H I');
  await until(() => window.__probe.state().heard, 'H I heard');
  await shot('answer');
  await until(() => window.__probe.state().phase === 'dark', 'CAN YOU eat me?', 60000);
  await sleep(4000);
  await shot('dark');
  await until(() => window.__probe.state().phase === 'stack', 'lights back: Fable lies low with Haiku on its back', 90000);
  const h0 = await actor('haiku');
  if (h0.y < 1.5) throw new Error('Haiku is not on Fable\'s back');
  await sleep(1200);
  await shot('morning');

  // 3. wrong: Opus under the crank, from the floor
  await portrait(1);
  await click(...CRANK, 'crank (as Opus)');
  await until(() => window.__probe.state().ups >= 1, 'Opus cannot reach the crank', 40000);
  await idle('opus');

  // Haiku goes to the crank: Fable follows it there and scoops it up
  await portrait(3);
  await click(...CRANK, 'crank (as Haiku)');
  await until(() => window.__probe.state().ups >= 2, 'Haiku cannot reach it either', 40000);
  await until(() => { const f = window.__probe.fable(); return Math.abs(f.x - 5) < 0.05 && Math.abs(f.z - 8) < 0.05 && !f.busy; }, 'Fable followed Haiku under the crank', 40000);
  await until(() => { const a = window.__probe.actor('haiku'); return a.y > 1.5 && !a.busy; }, 'Haiku on Fable\'s back', 20000);
  await shot('led');

  // wrong: Haiku alone on Fable. Fable stands up to help, still too short
  await click(...CRANK, 'crank (Haiku on Fable)');
  await until(() => window.__probe.state().ups >= 3, 'Fable stood up, Haiku still short', 40000);
  await until(() => { const f = window.__probe.fable(); return f.c > 0.99 && !window.__world.locked; }, 'Fable lies down again', 20000);

  // the stack: Haiku steps aside, Opus to the middle of Fable's back, Sonnet, then Haiku
  await click(6.7, 1.76, 8.0, 'Fable\'s back (Haiku aside)');
  await until(() => { const a = window.__probe.actor('haiku'); return Math.abs(a.x - 6.7) < 0.3 && !a.busy; }, 'Haiku aside');
  await portrait(1);
  await click(5.0, 1.76, 8.0, 'Fable\'s back (Opus)');
  await until(() => { const a = window.__probe.actor('opus'); return a.y > 1.5 && Math.hypot(a.x - 5, a.z - 8) < 0.3 && !a.busy; }, 'Opus on Fable, under the crank', 40000);
  // wrong: bigger on smaller
  await head('haiku', 'Haiku head (as Opus)');
  await until(() => window.__probe.state().heavy >= 1, 'Opus is too big to stand on Haiku');
  await portrait(2);
  await head('opus', 'Opus head (as Sonnet)');
  await until(() => { const a = window.__probe.actor('sonnet'); return a.support === 'actor' && !a.busy; }, 'Sonnet on Opus', 40000);
  await portrait(3);
  await head('sonnet', 'Sonnet head (as Haiku)');
  await until(() => { const a = window.__probe.actor('haiku'); return a.support === 'actor' && !a.busy; }, 'Haiku on top', 40000);
  await shot('stack');

  // 4. the crank, the hatch, dawn
  await click(...CRANK, 'crank (top of the stack)');
  await until(() => window.__probe.state().hatchOpen, 'the hatch opens', 40000);
  await sleep(3000);
  await shot('dawn');
  await until(() => window.__probe.state().phase === 'end', 'Fable floats out', 90000);
  await sleep(4000);
  await shot('credits');
  await page.waitForSelector('#again:not([hidden])', { timeout: 60000 });
  console.log('ok   final card');
  await sleep(600);
  await shot('again');
}, { });
