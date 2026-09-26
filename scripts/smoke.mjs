// End-to-end smoke test: plays the whole story (intro -> town -> troll -> wyrm -> ending)
// against a running dev server, fast-forwarding battles. Screenshots go to shots/.
// Usage: npm run dev (in another terminal), then: npm run smoke
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

mkdirSync('shots', { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 768, height: 672 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.stack));
const tap = async (k) => { await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k); await page.waitForTimeout(60); };
const topName = () => page.evaluate(() => __game.top?.constructor.name);
const shot = (n) => page.locator('#screen').screenshot({ path: `shots/e2e_${n}.png` });

async function mashUntil(cond, label, max = 400) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate(cond)) return true;
    const top = await topName();
    if (top === 'BattleScene') {
      await page.evaluate(() => { for (const e of __game.top.enemies ?? []) if (e.c.hp > 1) e.c.hp = 1; });
    }
    await tap('Enter');
    await page.waitForTimeout(80);
  }
  console.log('FAILED waiting for', label, 'top=', await topName());
  return false;
}

// 1. New game through intro
await page.goto(BASE);
await page.waitForTimeout(1500);
await tap('Enter'); await page.waitForTimeout(1200);
await tap('Escape'); await page.waitForTimeout(1500);
await mashUntil(() => __game.top?.constructor.name === 'FieldScene' && !__game.top.busy && __game.top.state.hasFlag('intro_done'), 'intro');
console.log('intro done; items:', await page.evaluate(() => JSON.stringify(__game.top.state.inventory.entries())), 'gold', await page.evaluate(() => __game.top.state.gold));
await shot('after_intro');
// walk out of the house
for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown']) { await page.keyboard.down(k); await page.waitForTimeout(260); await page.keyboard.up(k); }
await page.waitForTimeout(800);
console.log('map after exit:', await page.evaluate(() => __game.top.state.location.map));
await shot('town');
// open menu
await tap('Escape'); await page.waitForTimeout(300); await shot('menu');
await tap('Escape'); await page.waitForTimeout(300);

// 2. Troll
await page.evaluate(() => { const f = __game.top; f.state.setFlag('seal_broken'); return f.changeMap('cave1', 14, 7, 'up'); });
await page.waitForTimeout(800);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(250); await page.keyboard.up('ArrowUp');
await page.waitForTimeout(500);
await shot('troll_cutscene');
await mashUntil(() => __game.top?.constructor.name === 'BattleScene', 'troll battle');
await page.waitForTimeout(1500); await shot('troll_battle');
await mashUntil(() => __game.top?.constructor.name === 'FieldScene' && !__game.top.busy && __game.top.state.hasFlag('troll_defeated'), 'troll defeated');
console.log('troll defeated. levels:', await page.evaluate(() => __game.top.state.party.map(m => m.level).join(',')));

// 3. Wyrm
await page.evaluate(() => __game.top.changeMap('cave2', 16, 9, 'up'));
await page.waitForTimeout(800);
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(250); await page.keyboard.up('ArrowUp');
await page.waitForTimeout(3000);
await shot('wyrm_cutscene');
await mashUntil(() => __game.top?.constructor.name === 'BattleScene', 'wyrm battle');
await page.waitForTimeout(1500); await shot('wyrm_battle');
await mashUntil(() => __game.top?.constructor.name === 'MessageScene' && __game.top.opts.speaker === 'Heartstone Spirit', 'spirit');
await shot('spirit');
await mashUntil(() => __game.top?.constructor.name === 'EndingScene', 'ending');
await page.waitForTimeout(8000); await shot('ending');
await browser.close();
console.log('Smoke test finished.');
