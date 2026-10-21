// Play the prologue start to finish with real mouse clicks, in headless Chromium.
//   node tools/playtest.mjs [screenshotDir]
import { drive } from './lib/drive.mjs';

const RX = 11.2;
await drive('prologue', async ({ page, click, until, sleep, shot, portrait, settle, at }) => {
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
  await click(0.3, 1.0, 2.1, 'main valve');
  await until(() => window.__probe.state().main, 'main valve open');
  await click(0.79, 1.1, 3.75, 'valve B lever');
  await until(() => !window.__probe.valves().B, 'valve B closed');
  await click(0.79, 1.1, 4.35, 'valve C lever');
  await until(() => !window.__probe.valves().C, 'valve C closed');
  await click(0.79, 0.9, 3.33, 'valve A lever');
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
  await click(1.3, 1.7, 6.0, 'Opus head');
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
  await click(RX, 0.56 + 0.8, 4.1, 'Opus head');
  await until(() => window.__probe.actor('sonnet').support === 'actor' && !window.__probe.actor('sonnet').busy, 'Sonnet on Opus');
  await portrait(3);
  await click(RX + 1.4, 0.57, 4.12, 'plinth (Haiku)');
  await until(() => { const a = window.__probe.actor('haiku'); return a.y > 0.5 && !a.busy; }, 'Haiku on the plinth');
  await click(RX, 0.56 + 0.83 + 0.62, 4.1, 'Sonnet head');
  await until(() => window.__probe.actor('haiku').support === 'actor' && !window.__probe.actor('haiku').busy, 'Haiku on top');
  await shot('stack');
  await click(RX - 0.3, 2.95, 3.46, 'the glass');
  await until(() => window.__probe.state().ended, 'tapped the glass');
  await sleep(2600);
  await shot('eyes');
  await page.waitForSelector('#card:not([hidden])', { timeout: 20000 });
  console.log('ok   chapter 1 card');
  await sleep(800);
  await shot('card');
});
