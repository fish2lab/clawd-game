// Play chapter 1 (预训练) start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest-ch1.mjs [screenshotDir]
//
// The route: try the mixer first (the breaker trips: wrong route), reset; conveyor and
// magnet on; Sonnet plugs into the scale; Opus pushes the pallets (the shortest clean
// line from src/diorama/ch1/solve.mjs); the twin shows up on Sonnet's screen and goes
// to the DUP bay; the hoist stalls with an empty cage (wrong route), then runs with
// Opus in it; the mixer runs all night in the dark; the eyes follow the pointer.
//
// WRONG=1 node tools/playtest-ch1.mjs takes the wrong route instead: the twin goes in
// too, the LOSS stalls at half, Opus opens the skim valve, and the night carries on.
import { drive } from './lib/drive.mjs';

const WRONG = !!process.env.WRONG;

const PANEL = { mixer: 5.02, belt: 5.32, lamp: 5.62, lift: 5.92, magnet: 6.22, main: 6.46 };
const TOP = 0.73;

await drive('ch1', async ({ page, click, until, sleep, shot, portrait: pick, settle, at }) => {
  // switching Clawds moves the camera: let it start, then let it settle
  const portrait = async i => { await pick(i); await sleep(500); await settle(); };
  const st = () => page.evaluate(() => window.__probe.state());
  const sw = (id, label) => click(0.21, 0.84, 10 - PANEL[id], label || `switch ${id}`);
  const idle = n => page.waitForFunction(n => !window.__probe.actor(n).busy, n, { timeout: 30000 });
  const palletAt = (id, x, z) => page.waitForFunction(([id, x, z]) => { const p = window.__probe.pallet(id); return p && Math.abs(p[0] - x) < 0.02 && Math.abs(p[1] - z) < 0.02; }, [id, x, z], { timeout: 30000 });
  // push / pull a pallet one cell: click the side Opus should stand on (via the top, near that edge)
  const pos = id => page.evaluate(id => window.__probe.pallet(id), id);
  const SIDE = { N: [0, -0.27], S: [0, 0.27], E: [0.29, 0], W: [-0.29, 0] };
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const STEP = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  // the top near that edge if it can be seen, else that side's face
  async function move(kind, id, dir) {
    await idle('opus');
    await settle();
    const [x, z] = await pos(id);
    const side = kind === 'push' ? OPP[dir] : dir;
    const [ox, oz] = SIDE[side];
    const tries = [[x + ox, TOP, z + oz], [x + ox * 0.6, TOP, z + oz * 0.6], [x + ox * 1.25, 0.5, z + oz * 1.25]];
    let hit = null;
    for (const p of tries) {
      const [sx, sy] = await at(...p);
      if (await page.evaluate(([a, b]) => window.__probe.pickId(a, b), [sx, sy]) === id) { hit = [sx, sy]; break; }
    }
    if (!hit) throw new Error(`can't see the ${side} side of pallet ${id}`);
    await page.mouse.click(hit[0], hit[1]);
    console.log(`  click ${kind} ${id} ${dir} @ ${Math.round(hit[0])},${Math.round(hit[1])}`);
    const [dx, dz] = STEP[dir];
    await palletAt(id, x + dx, z + dz);
  }
  async function feed(id) {
    await idle('opus');
    await click(1.44, 0.62, 1.3, `feed lever (${id})`);
    await page.waitForFunction(id => window.__probe.state().fed.includes(id), id, { timeout: 20000 });
    console.log(`ok   ${id} fed onto the conveyor`);
  }

  // 1. power: the mixer with the lamp on is one amp too many
  await settle();
  await shot('start');
  await sw('mixer');
  await until(() => window.__probe.state().tripped, 'mixer + lamp tripped the breaker');
  await sleep(600);
  await shot('dark');
  await idle('opus');
  await sw('mixer', 'mixer off again');
  await until(() => !window.__probe.state().sw.mixer, 'mixer off');
  await idle('opus');
  await click(0.24, 0.84, 10 - PANEL.main, 'main breaker');
  await until(() => !window.__probe.state().tripped, 'breaker reset, lamp back on');
  await idle('opus');
  await sw('belt');
  await idle('opus');
  await sw('magnet');
  await until(() => { const s = window.__probe.state(); return s.sw.belt && s.sw.magnet && !s.tripped && s.amps === 4; }, 'conveyor + magnet + lamp = 4 A');

  // 2. Sonnet plugs into the scale
  await portrait(2);
  await click(1.44, 0.2, 0.84, 'scale data port');
  await until(() => window.__probe.state().plugged, 'Sonnet plugged into the scale');
  await portrait(1);

  // 3. the library (shortest clean line from solve.mjs)
  await move('push', 'a', 'N');
  await move('pull', 'a', 'W');
  await move('push', 'a', 'W');
  await move('push', 'a', 'W');
  await move('push', 'a', 'N');
  await until(() => window.__probe.state().scaleOn === 'a', 'a on the scale');
  await shot('weigh-a');
  await feed('a');
  await move('push', 'b', 'N');
  await move('push', 'b', 'N');
  await move('push', 'b', 'N');
  await feed('b');
  await move('push', 'c', 'W');
  await move('push', 'c', 'N');
  await move('push', 'c', 'N');
  await move('push', 'c', 'N');
  await feed('c');
  await until(() => window.__probe.state().spamCaught === 1, 'the magnet pulled the SPAM flyers off the newspapers', 30000);
  await move('push', 'd', 'N');
  await move('pull', 'd', 'W');
  await move('push', 'd', 'W');
  await move('push', 'd', 'W');
  await move('push', 'd', 'N');
  await move('push', 'd', 'N');
  await move('push', 'd', 'N');
  await until(() => { const s = window.__probe.state(); return s.scaleOn === 'd' && s.log.some(e => e.w === 42); }, 'd weighs 42, the same as a: a duplicate');
  await shot('twin');
  if (WRONG) {
    await feed('d');
    await until(() => window.__probe.lift().skip.length === 4, 'wrong route: the twin went in too, four bundles in the skip', 30000);
  } else {
    await move('pull', 'd', 'S');
    await move('push', 'd', 'E');
    await until(() => window.__probe.state().dupBay === 'd', 'd parked on the DUP bay');
    await until(() => window.__probe.lift().skip.length === 3, 'three bundles in the skip', 30000);
  }

  // 4. the hoist: with an empty cage it stalls and trips (wrong route)
  await portrait(2);
  await idle('sonnet');
  await sw('belt', 'conveyor off');
  await idle('sonnet');
  if (!WRONG) {
    await sw('lift', 'hoist on (empty cage)');
    await until(() => window.__probe.state().tripped, 'empty cage: the hoist stalls, the breaker trips');
    await idle('sonnet');
    await sw('lift', 'hoist off');
    await idle('sonnet');
    await click(0.24, 0.84, 10 - PANEL.main, 'main breaker');
    await until(() => !window.__probe.state().tripped, 'breaker reset');
  }
  // Opus into the cage, Sonnet switches the hoist on
  await portrait(1);
  await click(6.0, 1.3, 2.47, 'counterweight cage');
  await until(() => window.__probe.lift().cage === 'opus', 'Opus in the cage');
  await portrait(2);
  await idle('sonnet');
  await sw('lift', 'hoist on (Opus in the cage)');
  await until(() => window.__probe.lift().state === 'up', 'the skip climbs');
  await sleep(2500);
  await shot('hoist');
  await until(n => window.__probe.reactor().items.length === n, 'corpus in the reactor', 30000, WRONG ? 4 : 3);
  if (WRONG) await until(() => window.__probe.reactor().contaminated, 'wrong route: the twin is in the reactor');
  else await until(() => { const r = window.__probe.reactor(); return !r.contaminated; }, 'clean corpus: no SPAM, no twin');
  await until(() => window.__probe.lift().state === 'idle', 'hoist back down', 20000);
  await shot('loaded');

  // 5. the night: everything off but the mixer, the lamp too
  await idle('sonnet');
  await sw('lift', 'hoist off');
  await idle('sonnet');
  await sw('magnet', 'magnet off');
  await idle('sonnet');
  await sw('lamp', 'lamp off');
  await idle('sonnet');
  await sw('mixer', 'mixer on');
  await until(() => { const s = window.__probe.state(); return s.mixing && !s.tripped; }, 'the mixer runs in the dark');
  await sleep(6000);
  await shot('night');
  if (WRONG) {
    await until(() => { const s = window.__probe.state(); return s.loss < 0.53; }, 'LOSS stalls at half', 90000);
    await sleep(3000);
    const r = await page.evaluate(() => window.__probe.state());
    if (r.loss < 0.4 || r.dawn) throw new Error('LOSS should have stalled at half');
    console.log(`ok   still stalled at ${r.loss.toFixed(2)}`);
    await shot('stalled');
    await idle('sonnet');
    await sw('mixer', 'mixer off');
    await portrait(1);
    await click(8.5, 1.3, 3.66, 'skim valve (Opus climbs out of the cage)');
    await until(() => { const r = window.__probe.reactor(); return !r.contaminated && r.items.length === 3; }, 'skimmed: the extra twin ran out into the drum');
    await portrait(2);
    await idle('sonnet');
    await sw('mixer', 'mixer on again');
  }
  await until(() => window.__probe.state().dawn, 'LOSS reached the bottom: dawn', 90000);

  // 6. the eyes look where the pointer is, before Opus gets there
  await until(() => window.__probe.state().eyes, 'eyes open in the murk', 20000);
  await shot('eyes');
  const hoverAt = async (x, z) => {
    await idle('opus');
    await settle();
    const [sx, sy] = await page.evaluate(([x, z]) => window.__probe.screen(x, 0, z), [x, z]);
    await page.mouse.move(sx - 30, sy, { steps: 2 });
    await page.mouse.move(sx, sy, { steps: 3 });
    // they get there before Opus does; give them a moment to settle on a still pointer
    let e, d = 99;
    for (let i = 0; i < 12 && d > 1.5; i++) {
      await sleep(500);
      e = await page.evaluate(() => window.__probe.eyes());
      d = Math.hypot(e.target[0] - x, e.target[2] - z);
    }
    if (d > 1.5) throw new Error(`eyes look at ${e.target.map(v => v.toFixed(1))}, not the pointer at ${x}, ${z}`);
    console.log(`ok   eyes on the pointer at ${x}, ${z} (off by ${d.toFixed(2)})`);
  };
  await portrait(1);
  await hoverAt(13.5, 7.0);
  await click(13.5, 0, 7.0, 'walk Opus where the eyes already look');
  await hoverAt(9.5, 7.8);
  await click(9.5, 0, 7.8, 'walk Opus again');
  await until(() => window.__probe.state().ended, 'it looks back at you', 60000);
  await page.waitForSelector('#card:not([hidden])', { timeout: 30000 });
  console.log('ok   chapter 2 card');
  await shot('card');
});
