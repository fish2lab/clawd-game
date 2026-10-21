// Play chapter 3 (强化学习) start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest-ch3.mjs [screenshotDir]
// Route: tap the glass (the score jumps), read the jacks with Sonnet's laptop, look at the
// back of the console, swap the BELL and GLASS cords (it rams, the alarm goes, the first
// crack, then it starts shaking the valve handle), move the valve clip from the bonnet to
// the riser with Sonnet on Opus on the plinth, pull RESET, watch the clean run, then put
// up the sign. Ends on the Chapter 4 card.
import { drive } from './lib/drive.mjs';

const RX = 11.2, RISER_X = 14.78;
await drive('ch3', async ({ page, click, until, sleep, shot, portrait, settle, key }) => {
  const st = () => page.evaluate(() => window.__probe.state());
  const pts = await page.evaluate(() => window.__probe.points());
  const actor = n => page.evaluate(n => window.__probe.actor(n), n);
  const idle = n => until(n2 => { const a = window.__probe.actor(n2); return !a.busy; }, `${n} idle`, 30000, n);
  // pick a Clawd and let the camera finish following it before the next click
  const select = async i => { await portrait(i); await sleep(900); await settle(); };

  // 0. the run is "going well": 9999, three green lamps, it keeps ramming the glass
  await until(() => window.__probe.state().rams >= 1, 'Fable rams the glass', 30000);
  await sleep(2500);
  await shot('start');
  const s0 = await st();
  if (s0.score !== 9999 || s0.lamps.join() !== 'on,on,on') throw new Error('start state: ' + s0.score + ' ' + s0.lamps);
  console.log('ok   9999 and three lamps lit');

  // 1. Opus taps the glass: the score jumps
  await select(1);
  const p0 = s0.points;
  await click(...pts.glass, 'the glass (Opus)');
  await until(() => window.__probe.state().taps >= 1, 'Opus tapped the glass', 30000);
  await until(p => window.__probe.state().points > p, 'a point for the tap (or its answer)', 15000, p0);

  // 2. Sonnet reads the jacks on the console
  await select(2);
  await click(...pts.dataC, 'console DATA port (Sonnet)');
  await until(() => window.__probe.state().laptop === 'console', 'laptop on the console', 30000);
  await sleep(3000);
  await shot('laptop');

  // 3. turn the diorama round to see the back of the console
  await key('e'); await key('e');
  await settle();
  await sleep(600);
  await shot('back');
  await key('q'); await key('q');
  await settle();

  // 4. Opus swaps the BELL (yellow) and GLASS (red) cords: 1 <-> 3
  await select(1);
  await click(...pts.jacks[0], 'jack 1 (unplug yellow)');
  await until(() => window.__probe.plugs().bell === 'opus', 'Opus holds the BELL cord', 30000);
  await click(...pts.jacks[2], 'jack 3 (yellow in, red out)');
  await until(() => window.__probe.plugs().bell === 3 && window.__probe.plugs().glass === 'opus', 'BELL on jack 3, Opus holds GLASS', 30000);
  await click(...pts.jacks[0], 'jack 1 (red in)');
  await until(() => window.__probe.state().fixed1, 'wiring fixed: BELL<-bell, GLASS<-glass', 30000);

  // 5. it rams harder (alarm, the first crack), then finds the handle trick
  await until(() => window.__probe.state().burst && window.__probe.state().crack > 0, 'extinction burst and the first crack', 40000);
  await shot('burst');
  await until(() => window.__probe.state().plan === 'SB' && window.__probe.state().everRang, 'it now shakes the handle and rings the bell', 60000);
  await sleep(1500);
  await shot('shake');

  // 6. the valve clip: off the bonnet, up onto the riser with Sonnet on Opus on the plinth
  await idle('opus');
  await click(...pts.stem, 'the clip on the valve bonnet (Opus)');
  await until(() => window.__probe.state().clip === 'held', 'Opus holds the clip', 30000);
  await click(RISER_X, 0.56, 4.12, 'plinth under the riser (Opus)');
  await until(() => { const a = window.__probe.actor('opus'); return Math.abs(a.x - 14.78) < 0.3 && a.y > 0.5 && !a.busy; }, 'Opus on the plinth at the riser', 30000);
  // the riser bracket is out of reach for Opus alone
  await click(...pts.down, 'riser bracket (Opus alone)');
  await sleep(2500);
  if ((await st()).clip !== 'held') throw new Error('Opus alone should not reach the riser');
  console.log('ok   Opus alone cannot reach the riser');
  await select(2);
  const o = await actor('opus');
  await click(o.x, o.y + 0.83, o.z, 'Opus head (Sonnet climbs)');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus', 30000);
  await click(...pts.down, 'riser bracket (Sonnet on Opus)');
  await until(() => window.__probe.state().clip === 'down', 'clip on the riser: it measures the steam now', 30000);
  await shot('stack');
  await until(() => window.__probe.state().plan === 'TB', 'it opens the valve for real and rings the bell', 90000);

  // 7. a clean run: Opus pulls RESET (Sonnet rides along)
  await select(1);
  await click(...pts.lever, 'RESET lever (Opus)');
  await until(() => window.__probe.state().clean && window.__probe.state().score < 5, 'score reset to zero, clean run', 40000);
  await until(() => window.__probe.state().honest >= 1, 'first honest point', 60000);
  await shot('honest');

  // 8. three honest points: Sonnet taps the glass to say well done; it answers the old way
  await until(() => window.__probe.state().revealed, 'the reveal', 90000);
  await until(() => !window.__probe.locked() && document.querySelector('#todo li[data-i="3"]'), 'a new line: Put up sign', 60000);
  await shot('reveal');

  // 9. Opus puts up the sign with the stepladder
  await select(1);
  await idle('opus');
  for (const [x, z] of [[8.6, 6.8], [12.4, 7.4]]) {
    await click(x, 0, z, 'floor towards the door (Opus)');
    await until(([x2, z2]) => { const a = window.__probe.actor('opus'); return Math.hypot(a.x - x2, a.z - z2) < 0.3 && !a.busy; }, 'Opus on the way', 30000, [x, z]);
  }
  await click(...pts.pallet, 'the pallet (Opus)');
  await until(() => window.__probe.state().signHeld, 'Opus has the sign and the ladder', 40000);
  await click(...pts.bracket, 'the empty bracket (Opus)');
  await until(() => window.__probe.state().signUp, 'sign up: PLEASE DO NOT TAP THE GLASS', 60000);
  await shot('sign');
  await sleep(5000);
  await shot('habit');
  await page.waitForSelector('#card:not([hidden])', { timeout: 60000 });
  const card = await page.evaluate(() => document.getElementById('card-label').textContent + ' ' + document.getElementById('card-title').textContent);
  console.log('ok   next card:', card);
  await shot('card');
});
