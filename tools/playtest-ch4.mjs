// Play chapter 4 (蒸馏) start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest-ch4.mjs [screenshotDir]
// Takes the wrong routes a first-time player would (only the loudest note, a spout with
// too little water, Haiku distilled from the T 1 reading), then the right ones.
import { drive } from './lib/drive.mjs';

const RX = 11.2;
await drive('ch4', async ({ page, click, until, sleep, shot, portrait: who }) => {
  // switching Clawds swings the camera over to it: let it start moving before the next click
  const portrait = async i => { await who(i); await sleep(1800); };
  const S = () => page.evaluate(() => window.__probe.state());
  const pt = (fn, ...a) => page.evaluate(([f, args]) => window.__probe[f](...args), [fn, a]);
  const idle = n => page.waitForFunction(k => !window.__probe.actor(k).busy, n, { timeout: 30000 });
  const roundDone = (n, label) => until(k => { const s = window.__probe.state(); return s.round === k && !s.busy; }, label, 90000, n);
  const bell = () => click(2.2, 1.1, 6.06, 'desk bell');
  async function fader(i, v) {
    const [x, y, z] = await pt('fader', i, v);
    await click(x, y, z, `fader ${i + 1} -> ${v}`);
    await until(([k, w]) => window.__probe.state().faders[k] === w, `fader ${i + 1} = ${v}`, 20000, [i, v]);
  }

  // 1. the fish asks; ring the bell: the whale swallows it, a long silence, then the spout
  await sleep(2500);
  await shot('start');
  await bell();
  await until(() => window.__probe.state().busy, 'round 1 started');
  await roundDone(1, 'round 1: swallowed, spouted, CAN YOU eat me again?');
  await shot('round1');

  // 2. wrong route: match only the one tube you can see -> halfway
  await fader(1, 5);
  await bell();
  await roundDone(2, 'round 2');
  let s = await S();
  if (Math.abs(s.lastMatch - 5 / 12) > 1e-6) throw new Error('round 2 match ' + s.lastMatch);
  console.log('ok   only the loudest note: the fish gets', s.lastLift.toFixed(2), 'of the way');

  // 3. T up: the quiet notes come out; copy all five
  const [tx, ty, tz] = await pt('tKnob');
  for (let k = 2; k <= 5; k++) {
    await click(tx, ty, tz, 'T knob');
    await until(w => window.__probe.state().T === w, `T = ${k}`, 20000, k);
  }
  console.log('ok   tubes at T 5:', JSON.stringify((await pt('bars')).map(v => +v.toFixed(2))));
  await shot('t5');
  for (const [i, v] of [[0, 2], [2, 1], [3, 3], [4, 1]]) await fader(i, v);

  // 4. the song is right, but the water is too low: the spout sputters
  await bell();
  await roundDone(3, 'round 3');
  s = await S();
  if (!(s.lastMatch > 0.999 && s.lastCapped)) throw new Error('round 3 should sputter: ' + JSON.stringify([s.lastMatch, s.lastCapped, s.level]));
  console.log('ok   perfect song, sputters: water at', s.level.toFixed(2));
  await shot('sputter');

  // 5. water: open the inlet (the pipe is dry: bubbles, nothing else)
  await click(5.74, 0.73, 6.15, 'inlet valve lever');
  await until(() => window.__probe.state().inlet, 'inlet open');
  await sleep(1500);
  s = await S();
  if (s.flow > 0.001) throw new Error('water should not flow yet');
  // the crate of salt is in front of the hatch: Opus pushes it west
  await click(7.96, 0.45, 4.95, 'crate east face');
  await until(() => Math.abs(window.__probe.crate()[0] - 6.5) < 0.01, 'crate pushed off the hatch');
  // Opus can't fit the hatch; Haiku can
  await click(7.5, 0.2, 4.415, 'hatch (Opus)');
  await sleep(2500);
  await idle('opus');
  await portrait(3);
  await click(7.5, 0.2, 4.415, 'hatch (Haiku)');
  await until(() => window.__probe.state().crawling, 'Haiku crawls under the reactor', 30000);
  await until(() => window.__probe.state().cond && !window.__probe.state().crawling, 'condensate valve open, Haiku back out', 40000);
  await shot('hatch');
  await until(() => window.__probe.state().level >= 2.05, 'tank refilled to FULL', 60000);

  // 6. now the spout reaches the shelf; the fish noses the key off
  await portrait(1);
  await bell();
  await roundDone(4, 'round 4');
  await until(() => window.__probe.state().keyDown, 'key knocked off the shelf');
  await sleep(1500);
  await shot('key');
  const key = await pt('key');
  await click(key[0], key[1], key[2], 'the key on the floor');
  await until(() => window.__probe.state().keyTaken, 'key taken');

  // 7. the still
  await click(5.3, 1.0, 3.6, 'still cabinet door');
  await until(() => window.__probe.state().stillOpen, 'still unlocked and open', 30000);
  await portrait(2);
  await click(8.45, 1.2, 3.46, 'reactor data port');
  await until(() => window.__probe.state().plugged, 'Sonnet plugged into the data port', 40000);
  console.log('ok   laptop at T 1:', JSON.stringify((await pt('readout')).map(v => +v.toFixed(2))));
  await shot('readout-t1');

  // wrong route: copy what the laptop shows at T 1 (only the eye), distill
  await portrait(1);
  const valve = async (i, n) => {
    const [x, y, z] = await pt('valve', i);
    for (let k = 0; k < n; k++) {
      const v0 = (await S()).valves[i];
      await click(x, y + 0.02, z, `condenser valve ${i + 1}`);
      await until(([j, w]) => window.__probe.state().valves[j] === w, `valve ${i + 1} = ${(v0 + 1) % 6}`, 20000, [i, (v0 + 1) % 6]);
    }
  };
  await valve(3, 5);
  await portrait(3);
  await click(5.85, 0.9, 1.05, "Haiku's pod");
  await until(() => window.__probe.state().haikuIn, 'Haiku in its pod', 30000);
  await until(() => window.__probe.state().runs === 1 && !window.__probe.state().distilling, 'distilled from the T 1 reading: not enough, Haiku hops out', 60000);
  s = await S();
  console.log('ok   first distillation scored', s.distillQ.toFixed(2));

  // 8. still T up, read all five, set the five condenser valves
  await portrait(1);
  for (let k = 2; k <= 5; k++) {
    await click(5.15, 0.2, 3.42, 'still T knob');
    await until(w => window.__probe.state().sT === w, `still T = ${k}`, 20000, k);
  }
  console.log('ok   laptop at T 5:', JSON.stringify((await pt('readout')).map(v => +v.toFixed(2))));
  await shot('readout-t5');
  await valve(0, 2);
  await valve(1, 1);
  await valve(2, 3);
  await valve(4, 1);
  await shot('valves');

  // 9. Haiku sits in its pod: drops of light; Haiku 5.5 taps the glass twice; the porthole answers
  await portrait(3);
  await click(5.85, 0.9, 1.05, "Haiku's pod");
  await until(() => window.__probe.state().haikuIn, 'Haiku in its pod again', 30000);
  await sleep(5000);
  await shot('distilling');
  await until(() => window.__probe.state().distilled, 'distilled: Haiku 5.5', 60000);
  await sleep(4500);
  await shot('tap');
  await page.waitForSelector('#card:not([hidden])', { timeout: 60000 });
  const card = await page.evaluate(() => [document.getElementById('card-label').textContent, document.getElementById('card-title').textContent]);
  console.log('ok   next card:', JSON.stringify(card));
  if (card[0] !== 'CHAPTER 5') throw new Error('expected the chapter 5 card');
  await shot('card');
});
