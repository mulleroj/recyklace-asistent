import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByPlaceholder(/napi/i).fill('PET lahev');
await page.getByRole('button', { name: /hledat/i }).click();
await page.getByText(/plast/i).first().waitFor({ timeout: 10_000 });
await page.getByRole('button', { name: /zav/i }).click().catch(() => undefined);
await page.getByRole('button', { name: /menu|kalendar/i }).first().click();
await page.getByText(/kalendar|kalend/i).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
await page.keyboard.press('Escape');
await page.setViewportSize({ width: 320, height: 720 });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.context().setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByText(/tridic|třidič/i).first().waitFor({ timeout: 10_000 });

await browser.close();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Browser smoke PASS');
