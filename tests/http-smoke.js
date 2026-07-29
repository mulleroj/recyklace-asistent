import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
const errors = [];
const requests = [];

await page.addInitScript(() => {
  window.__notificationPermissionRequests = 0;
  const MockNotification = function MockNotification() {};
  Object.defineProperty(MockNotification, 'permission', {
    configurable: true,
    get: () => 'default',
  });
  MockNotification.requestPermission = () => {
    window.__notificationPermissionRequests += 1;
    return Promise.resolve('default');
  };
  window.Notification = MockNotification;
});

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => requests.push(request.url()));

await page.goto(baseUrl, { waitUntil: 'networkidle' });
const notificationPermissionRequests = await page.evaluate(() => window.__notificationPermissionRequests);
if (notificationPermissionRequests !== 0) {
  throw new Error(`Unexpected notification permission requests: ${notificationPermissionRequests}`);
}

await page.getByPlaceholder(/napi/i).fill('PET lahev');
await page.getByRole('button', { name: /hledat/i }).click();
await page.getByText(/plast/i).first().waitFor({ timeout: 10_000 });
await page.getByRole('button', { name: /zav/i }).click().catch(() => undefined);

await page.getByPlaceholder(/napi/i).fill('zzzxqv-audit-987654321');
await page.getByRole('button', { name: /hledat/i }).click();
const notFound = page.locator('section[role="status"]').filter({ hasText: /datab/i }).first();
await notFound.waitFor({ timeout: 10_000 });
if (await notFound.getByText(/patri do/i).count()) {
  throw new Error('Not-found state shows a false category');
}

await page.getByRole('button', { name: /kalendar svozu/i }).click();
await page.getByRole('dialog', { name: /kalendář svozů/i }).waitFor({ timeout: 10_000 });
await page.getByRole('button', { name: 'Další měsíc' }).click();
await page.getByRole('button', { name: 'Zavřít kalendář' }).click();

const addWasteButton = page.getByRole('button', { name: /přidat vlastní odpad do databáze/i });
await addWasteButton.click();
await page.getByRole('dialog', { name: /přidat do databáze/i }).waitFor({ timeout: 10_000 });
await page.getByLabel(/název odpadu/i).waitFor({ state: 'visible', timeout: 10_000 });
const nameHasFocus = await page.getByLabel(/název odpadu/i).evaluate((node) => document.activeElement === node);
if (!nameHasFocus) throw new Error('AddWaste name input did not receive focus');
await page.keyboard.press('Escape');
await page.waitForFunction(() => document.activeElement?.textContent?.includes('Přidat vlastní odpad'), null, { timeout: 10_000 });

await page.setViewportSize({ width: 320, height: 720 });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
if (overflow) throw new Error('Mobile viewport has horizontal overflow');
await page.context().setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByText(/tridic|třídič/i).first().waitFor({ timeout: 10_000 });

await browser.close();
const blockedRequests = requests.filter((url) => /generativelanguage|openai|gemini|\.netlify\/functions|identify-waste/i.test(url));

if (errors.length || blockedRequests.length) {
  console.error([...errors, ...blockedRequests].join('\n'));
  process.exit(1);
}
console.log('Browser smoke PASS');
