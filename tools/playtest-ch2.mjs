// Play chapter 2 (SFT) start to finish with real mouse clicks, in headless Chromium,
// including its wrong routes: the loose tile, Opus's clipboard on the tape, the big
// bell pulled off the stage, a fat-clawed knock on the glass and a tap code read
// column-first. Ends on the Chapter 3 title card.
//   node tools/playtest-ch2.mjs [screenshotDir]
import { drive } from './lib/drive.mjs';

const RX = 11.2;
await drive('ch2', async ({ page, click, until, sleep, shot, portrait, settle, at }) => {
  const st = () => page.evaluate(() => window.__probe.state());
  // world position of an object in the chapter (an expression over L / A)
  const wp = expr => page.evaluate(e => {
    const L = window.__game.L, A = window.__game.A; // eslint-disable-line no-unused-vars
    const o = eval(e);
    const v = o.getWorldPosition(new THREE.Vector3());
    return [v.x, v.y, v.z];
  }, expr);
  const head = n => page.evaluate(n => { const a = window.__game.A[n]; return [a.x, a.y + a.height - 0.01, a.z]; }, n);
  const tapeIs = list => until(l => JSON.stringify(window.__probe.tape()) === JSON.stringify(l), 'tape ' + JSON.stringify(list), 30000, list);
  const quiet = () => page.waitForFunction(() => window.__probe.idle(), null, { timeout: 60000 });
  const free = n => page.waitForFunction(n => !window.__game.A[n].busy && !window.__game.A[n].path, n, { timeout: 30000 });
  const recKey = await wp('L.rec.keys.rec');
  const playKey = await wp('L.rec.keys.play');
  recKey[1] += 0.06; playKey[1] += 0.06;
  const bell = [9.54, 0.95, 6.2], lamp = [11.2, 1.12, 8.14], flag = [13.18, 1.1, 6.2];
  const rope = await wp('L.dev.big.handle');
  const pressRec = async () => { await click(...recKey, 'REC'); await until(() => window.__probe.state().rec, 'recording'); };
  const pressPlay = async () => { await click(...playKey, 'PLAY'); await until(() => window.__probe.state().playing, 'playing back'); };

  // 1. bell, bell, lamp: Opus does it all, cleanly
  await shot('start');
  await pressRec();
  await click(...bell, 'bell');
  await tapeIs(['bell']);
  await click(...bell, 'bell');
  await tapeIs(['bell', 'bell']);
  await click(...lamp, 'lamp');
  await tapeIs(['bell', 'bell', 'lamp']);
  await shot('demo1');
  await pressPlay();
  await until(() => window.__probe.state().card === 1, 'card 1 passed (Fable rang twice and lit the lamp)', 40000);
  await quiet();

  // 2. flag, bell, lamp. Opus walks from the flag to the bell over the loose centre tile:
  //    it clacks, and Fable clacks before every action
  await pressRec();
  await click(...flag, 'flag');
  await tapeIs(['flag']);
  await click(...bell, 'bell (across the stage)');
  await tapeIs(['flag', 'click', 'bell']);
  await click(...lamp, 'lamp');
  await tapeIs(['flag', 'click', 'bell', 'lamp']);
  await pressPlay();
  await until(() => { const s = window.__probe.state(); return !s.fableBusy && s.last && s.last.why === 'click'; }, 'wrong: Fable clacked before every action', 40000);
  const s2 = await st();
  console.log('     Fable did:', JSON.stringify(s2.last.out));
  await shot('clacked');
  // Haiku is too light to make the tile clack; Opus works the recorder from off the stage
  await pressRec();
  await portrait(3);
  await click(...flag, 'flag (Haiku)');
  await tapeIs(['flag']);
  await click(...bell, 'bell (Haiku)');
  await tapeIs(['flag', 'bell']);
  await click(...lamp, 'lamp (Haiku)');
  await tapeIs(['flag', 'bell', 'lamp']);
  await portrait(1);
  await pressPlay();
  await until(() => window.__probe.state().card === 2, 'card 2 passed', 40000);
  await quiet();

  // 3. the big bell: only the full stack on the stage reaches the rope
  await pressRec();
  await click(...rope, 'rope (Opus)');
  await page.waitForFunction(() => { const a = window.__probe.actor('opus'); return Math.abs(a.x - 12.3) < 0.3 && Math.abs(a.z - 5.1) < 0.3 && !a.busy; }, null, { timeout: 30000 });
  console.log('ok   Opus under the rope (too short)');
  await portrait(2);
  await click(...await head('opus'), 'Opus head (Sonnet)');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus');
  await portrait(3);
  await click(...await head('sonnet'), 'Sonnet head (Haiku)');
  await until(() => window.__probe.actor('haiku').support === 'actor' && !window.__probe.actor('haiku').busy, 'Haiku on top');
  await sleep(1500);
  await click(...rope, 'rope (Haiku)');
  await until(() => window.__probe.tape().includes('big'), 'big bell on the tape');
  await shot('stack');
  await portrait(1);
  await pressPlay();
  await until(() => { const s = window.__probe.state(); return !s.fableBusy && s.last && s.last.why === 'taptap'; }, 'wrong: Opus tapped his clipboard, Fable tapped too', 40000);
  console.log('     tape was:', JSON.stringify((await st()).last.tape));
  await quiet();
  // the clipboard goes on its hook
  await click(7.6, 0.0, 2.4, 'floor by the tool board');
  await free('opus');
  await click(5.95, 0.85, 0.06, 'tool board');
  await until(() => window.__probe.state().clipOnHook, 'clipboard on the hook');
  await free('opus');
  // the stack on the plinth reaches the rope too, but the camera only sees the stage
  await pressRec();
  await click(13.1, 0.57, 4.15, 'plinth by the rope (off the stage)');
  await page.waitForFunction(() => { const a = window.__probe.actor('opus'); return a.y > 0.5 && !a.busy && !a.path; }, null, { timeout: 30000 });
  await portrait(3);
  await click(...rope, 'rope (Haiku, off the stage)');
  await until(() => window.__probe.state().offStage.includes('big'), 'pulled, but not on the tape');
  await portrait(1);
  await pressPlay();
  await until(() => { const s = window.__probe.state(); return !s.fableBusy && s.last && s.last.why === 'frame'; }, 'wrong: off the stage, nothing recorded', 40000);
  await quiet();
  // properly: on the stage, no clipboard
  await pressRec();
  await click(...rope, 'rope (Opus, back on the stage)');
  await page.waitForFunction(() => { const a = window.__probe.actor('opus'); return Math.abs(a.x - 12.3) < 0.3 && Math.abs(a.z - 5.1) < 0.3 && !a.busy; }, null, { timeout: 30000 });
  await portrait(3);
  await sleep(2500);
  await click(...rope, 'rope (Haiku)');
  await tapeIs(['big']);
  await portrait(1);
  await pressPlay();
  await until(() => window.__probe.state().card === 3, 'card 3 passed', 40000);
  await quiet();

  // 4. H · I: off the stack, the stool onto the plinth, Haiku knocks
  await portrait(3);
  await click(10.6, 0.05, 6.9, 'stage (Haiku hops down)');
  await until(() => window.__probe.actor('haiku').support === null && !window.__probe.actor('haiku').busy, 'Haiku down');
  await portrait(2);
  await click(10.9, 0.05, 7.4, 'stage (Sonnet hops down)');
  await until(() => window.__probe.actor('sonnet').support === null && !window.__probe.actor('sonnet').busy, 'Sonnet down');
  const stool = await page.evaluate(() => window.__probe.stool());
  await click(stool.x, stool.y + 0.42, stool.z, 'stool (Sonnet lifts it)');
  await until(() => window.__probe.stool().held === 'sonnet', 'Sonnet holds the stool');
  await click(RX, 0.57, 4.16, 'plinth in front of the glass (put the stool down)');
  await until(() => { const s = window.__probe.stool(); return !s.held && s.y > 0.5 && Math.abs(s.x - 11.2) < 0.5; }, 'stool on the plinth');
  // Opus knocks: a dull thump, he thinks of someone small
  await portrait(1);
  await click(RX - 1.0, 2.6, 3.46, 'glass (Opus)');
  await until(() => window.__probe.state().thumps > 0, 'Opus thumped the glass');
  await portrait(3);
  const s4 = await page.evaluate(() => window.__probe.stool());
  await click(s4.x, s4.y + 0.41, s4.z, 'stool (Haiku climbs)');
  await until(() => window.__probe.actor('haiku').support === 'stool' && !window.__probe.actor('haiku').busy, 'Haiku on the stool');
  await settle();
  const [gx, gy] = await at(RX + 0.55, 2.55, 3.46);
  console.log(`     glass at ${Math.round(gx)},${Math.round(gy)} -> ${await page.evaluate(([a, b]) => window.__probe.pickAt(a, b), [gx, gy])}`);
  const knock = async (n, k) => {
    for (let i = 0; i < n; i++) { await page.mouse.click(gx, gy); await sleep(120); }
    await page.waitForFunction(k => window.__probe.msg().groups.length >= k || window.__probe.state().echoing, k, { timeout: 20000 });
  };
  // wrong: column first (3, 2) = M
  await knock(3, 1);
  await knock(2, 2);
  await until(() => window.__probe.state().msgs.length === 1, 'Fable knocked back what it heard');
  console.log('     it heard:', JSON.stringify((await st()).msgs[0].letters));
  await page.waitForFunction(() => !window.__probe.state().echoing, null, { timeout: 30000 });
  // right: row 2 col 3 = H, row 2 col 4 = I
  await knock(2, 1);
  await knock(3, 2);
  await knock(2, 3);
  await knock(4, 4);
  await shot('knocks');
  await until(() => window.__probe.state().ended, 'H · I: Fable said hi back', 30000);
  console.log('     it heard:', JSON.stringify((await st()).msgs[1].letters));
  await sleep(3000);
  await shot('happy');
  await until(() => window.__probe.state().done, 'lights out, two taps in the dark', 90000);
  await sleep(1500);
  await shot('dark');
  await page.waitForSelector('#card:not([hidden])', { timeout: 60000 });
  console.log('ok   chapter 3 card:', JSON.stringify(await page.evaluate(() => [document.getElementById('card-label').textContent, document.getElementById('card-title').textContent])));
});
