// Headless screenshot helper for development (uses the locally installed Chrome).
// Usage: node scripts/shot.mjs <url> <out.png> [--wait=ms] [--keys=Enter,wait:500,ArrowDown*3,hold:ArrowUp:800] [--after=ms] [--eval=js]
//   wait:N        pause N ms
//   Key*N         tap a key N times
//   hold:Key:ms   hold a key down for ms
// Page console errors/warnings are printed to stderr.
import { chromium } from 'playwright-core';

const [url, out, ...rest] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--wait=ms] [--keys=...] [--after=ms]');
  process.exit(1);
}
const opts = Object.fromEntries(
  rest.map((a) => {
    const s = a.replace(/^--/, '');
    const i = s.indexOf('=');
    return i < 0 ? [s, 'true'] : [s.slice(0, i), s.slice(i + 1)];
  }),
);
const wait = Number(opts.wait ?? 800);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 256 * 3, height: 224 * 3 + 30 } });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.error(`[console.${m.type()}]`, m.text());
});
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(wait);
if (opts.eval) await page.evaluate(opts.eval);
if (opts.keys) {
  for (const tok of opts.keys.split(',')) {
    if (tok.startsWith('wait:')) {
      await page.waitForTimeout(Number(tok.slice(5)));
      continue;
    }
    if (tok.startsWith('hold:')) {
      const [, key, ms] = tok.split(':');
      await page.keyboard.down(key);
      await page.waitForTimeout(Number(ms));
      await page.keyboard.up(key);
      await page.waitForTimeout(50);
      continue;
    }
    const [key, times] = tok.split('*');
    for (let i = 0; i < Number(times ?? 1); i++) {
      await page.keyboard.down(key);
      await page.waitForTimeout(60);
      await page.keyboard.up(key);
      await page.waitForTimeout(90);
    }
  }
}
await page.waitForTimeout(Number(opts.after ?? 300));
await page.screenshot({ path: out });
await browser.close();
console.log('saved', out);
