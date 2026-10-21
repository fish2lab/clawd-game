// Smoke test of the chapter flow: start at a chapter's card, end it, check what comes next.
// ch1 ends on the Chapter 2 card; ch5 hands straight to the epilogue (no card), whose end
// is the final black card with only the way back to the start.
//   node tools/playtest-flow.mjs [screenshotDir]
import { drive } from './lib/drive.mjs';

const card = page => page.evaluate(() => [document.getElementById('card-label').textContent, document.getElementById('card-title').textContent, !document.getElementById('again').hidden]);

await drive('ch1', async ({ page, click, until }) => {
  await click(11.2, 3.35, 3.46, 'the porthole');
  await until(() => window.__probe.state().done, 'ch1 finished');
  await page.waitForSelector('#card:not([hidden])', { timeout: 20000 });
  console.log('ok   next card:', JSON.stringify(await card(page)));
});

await drive('ch5', async ({ page, click, until }) => {
  await page.evaluate(() => window.__probe.finish());   // ch5 itself is played in playtest-ch5.mjs
  await until(() => window.__probe.chapter() === 'epilogue', 'ch5 handed over to the epilogue', 60000);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__probe.finish());   // the epilogue itself is played in playtest-epilogue.mjs
  await page.waitForSelector('#again:not([hidden])', { timeout: 20000 });
  console.log('ok   final card:', JSON.stringify(await card(page)));
});
