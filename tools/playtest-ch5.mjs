// Play chapter 5 start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest-ch5.mjs [screenshotDir]
// Ends when the chapter hands over to the epilogue (ch5 has no next title card).
import { drive } from './lib/drive.mjs';

const RX = 11.2;
const st = () => window.__probe.state();

await drive('ch5', async ({ page, click, until, sleep, shot, portrait: pick, settle, at }) => {
  // switch Clawd and give the camera a moment to start following (settle() only sees a moving camera)
  const portrait = async i => { await pick(i); await sleep(1500); };
  const probe = (name, ...args) => page.evaluate(([n, a]) => window.__probe[n](...a), [name, args]);
  const idle = n => page.waitForFunction(k => { const a = window.__probe.actor(k); return !a.busy; }, n, { timeout: 60000 });

  // 1. the blueprint on the drafting table, held up close; a click puts it down
  await shot('start');
  await click(10.7, 0.96, 7.1, 'blueprint');
  await until(() => window.__probe.closeup() === 'blueprint', 'blueprint held up');
  await sleep(600);
  await shot('blueprint');
  const vp = page.viewportSize();
  await page.mouse.click(vp.width * 0.72, vp.height * 0.5);
  await until(() => window.__probe.closeup() === null, 'blueprint put down');

  // over to the steam station (the camera follows)
  await click(2.4, 0, 3.6, 'floor by the station');
  await idle('opus');
  // a wrong route on the way: Opus has no laptop for a data port
  await click(0.72, 0.62, 3.75, 'route port (Opus)');
  await idle('opus');

  // 2. steam: open B and C, shut A (the copper line tees off A; it has no valve of its own)
  await click(0.79, 0.9, 3.93, 'valve B lever (across)');
  await until(() => window.__probe.valves().B, 'valve B open');
  await click(0.79, 0.9, 4.53, 'valve C lever (across)');
  await until(() => window.__probe.valves().C, 'valve C open');
  await click(0.79, 1.1, 3.15, 'valve A lever (up)');
  await until(() => !window.__probe.valves().A, 'valve A shut');
  await until(() => window.__probe.state().feed < 0.01, 'nothing feeds the reactor');

  // A's crossing section, leaning on the wall: Opus bolts it back in (the pipes cross again)
  const sec = await probe('sectionAt');
  await click(sec[0], sec[1], sec[2], 'A section');
  await until(() => window.__probe.state().section, 'A section bolted back', 60000);
  await idle('opus');
  await shot('section');

  // 3. the vent: Sonnet takes Haiku's pod wheel; Opus rolls the crate under the locker
  await portrait(2);
  const w = await probe('wheelAt');
  await click(w[0], w[1], w[2], "Haiku's pod wheel (Sonnet)");
  await until(() => { const s = window.__probe.state(); return s.wheel === 'held' && s.holder === 'sonnet'; }, 'Sonnet has the wheel');
  await portrait(1);
  await click(2.3, 0.45, 8.45, 'crate south face');
  await until(() => Math.abs(window.__probe.crate()[1] - 7.0) < 0.01, 'crate pushed north');
  await click(2.3, 0.45, 7.45, 'crate south face');
  await until(() => Math.abs(window.__probe.crate()[1] - 6.0) < 0.01, 'crate pushed north again');
  await click(2.75, 0.45, 6.0, 'crate east face');
  await until(() => Math.abs(window.__probe.crate()[0] - 1.3) < 0.01, 'crate pushed west, under the locker');
  await click(1.3, 0.9, 6.0, 'crate top');
  await until(() => window.__probe.actor('opus').support === 'crate', 'Opus on the crate');
  await portrait(2);
  await click(1.3, 1.74, 6.0, 'Opus head');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus');
  await click(0.3, 2.65, 5.3, 'vent valve');
  await until(() => window.__probe.state().wheel === 'locker', 'vent shut, wheel left on the locker', 60000);
  await shot('vent');

  // 4. the porthole bolt: the full stack on the plinth, Haiku on top
  await click(3.4, 0, 6.6, 'floor (Sonnet down)');
  await idle('sonnet');
  await portrait(1);
  await click(8.6, 0.57, 4.12, 'plinth (Opus)');
  await until(() => { const a = window.__probe.actor('opus'); return Math.abs(a.x - 8.6) < 0.3 && a.y > 0.5 && !a.busy; }, 'Opus on the plinth', 60000);
  await portrait(2);
  await click(8.6, 0.56 + 0.83, 4.1, 'Opus head');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus', 60000);
  await portrait(3);
  await click(9.7, 0.57, 4.12, 'plinth (Haiku)');
  await until(() => { const a = window.__probe.actor('haiku'); return a.y > 0.5 && !a.busy; }, 'Haiku on the plinth', 60000);
  await click(8.6, 0.56 + 0.83 + 0.65, 4.1, 'Sonnet head');
  await until(() => window.__probe.actor('haiku').support === 'actor' && !window.__probe.actor('haiku').busy, 'Haiku on top');
  const b = await probe('boltAt');
  await click(b[0], b[1], b[2], 'loose bolt');
  await until(() => window.__probe.state().bolt, 'bolt turned in');
  await shot('bolt');

  // 5. Haiku squeezes under the pipes beside the reactor and taps W-H-Y at the hatch
  await click(15.2, 0, 4.9, 'floor (Haiku down)');
  await idle('haiku');
  await click(14.55, 0.27, 0.9, 'hatch');
  await until(() => window.__probe.tapState().at, 'Haiku at the hatch', 60000);
  await settle();
  const [hx, hy] = await at(14.55, 0.27, 0.9);
  const tapN = async n => { for (let i = 0; i < n; i++) { await page.mouse.click(hx, hy); await sleep(120); } await sleep(1700); };
  for (const [r, c] of [[5, 2], [2, 3], [5, 4]]) { await tapN(r); await tapN(c); }
  console.log('  tapped W-H-Y');
  await until(() => window.__probe.state().why, 'Fable answered (GROW)', 120000);
  await shot('grow');

  // 6. Sonnet runs the tests; they pass, and Fable asks
  await portrait(2);
  await click(14.53, 0.75, 3.3, 'test port');
  await until(() => window.__probe.state().tested, 'tests pass', 90000);
  await until(() => window.__probe.state().phase === 'when' && !window.__probe.locked(), 'WHEN?', 90000);
  await shot('when');

  // 7. Opus answers with tomorrow night's list, held to the glass; then lights out
  await portrait(1);
  await click(RX - 0.3, 3.35, 3.46, 'the glass (Opus)');
  await until(() => window.__probe.state().phase === 'answer' || window.__probe.state().phase === 'end', 'Opus writes the list', 60000);
  await until(() => window.__probe.state().phase === 'end', 'lights out', 120000);
  await shot('bedtime');
  await page.waitForFunction(() => window.__probe.chapter() === 'epilogue', null, { timeout: 180000 });
  console.log('ok   handed over to the epilogue');
  // the room as chapter 5 left it must be the prologue's start
  const end = await page.evaluate(() => window.__ch5End);
  console.log('  end state:', JSON.stringify(end));
  const want = { main: false, valves: { A: false, B: true, C: true }, wheelOnLocker: true, haikuSpindle: true, crate: [2.3, 8], doorsShut: true, inPods: true, lampsOff: true, sonnetIced: true, sonnetAsleep: true };
  if (JSON.stringify(end) !== JSON.stringify(want)) throw new Error('end state differs from the prologue start: ' + JSON.stringify(end));
  console.log('ok   end state is the prologue start');
  await sleep(800);
  await shot('epilogue');
});
