import { expect, test } from '@playwright/test';

test('tanıtım akışı ve başlamamış oyundan doğrudan çıkış çalışır', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#welcome-screen')).toHaveClass(/is-active/);
  await page.keyboard.press('A');
  await expect(page.locator('#tribute-screen')).toHaveClass(/is-active/);
  await page.keyboard.press('A');
  await expect(page.locator('#mode-screen')).toHaveClass(/is-active/);
  await page.locator('[data-mode="locate"]').click();
  await expect(page.locator('#game-screen')).toHaveClass(/is-active/);
  await expect(page.locator('#timer')).toHaveText('00:00');
  await page.locator('#exit-button').click();
  await expect(page.locator('#mode-screen')).toHaveClass(/is-active/);
  await expect(page.locator('#exit-dialog')).toBeHidden();
});

test('dört oyun modu açılır ve Başla düğmesi süreyi etkinleştirir', async ({ page }) => {
  for (const mode of ['locate', 'fill', 'listen', 'plate']) {
    await page.goto('/#oyunlar');
    await page.locator(`[data-mode="${mode}"]`).click();
    await expect(page.locator('#start-game-button')).toBeVisible();
    await page.locator('#start-game-button').click();
    await expect(page.locator('#start-game-button')).toBeHidden();
    await expect(page.locator('#dynamic-controls')).not.toHaveAttribute('inert', '');
  }
});

test('kaydedilmiş sonuç rekor penceresinde görünür', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('turkiye-harita-sureleri', JSON.stringify([
      { mode: 'fill', seconds: 95, completed: 81, savedAt: '2026-11-20T12:00:00.000Z' }
    ]));
  });
  await page.goto('/#oyunlar');
  await page.locator('#records-button').click();
  expect(pageErrors).toEqual([]);
  await expect(page.locator('#records-dialog')).toBeVisible();
  await expect(page.locator('.record-row')).toContainText("81'i Doldur");
  await expect(page.locator('.record-row')).toContainText('01:35');
});

test('kişisel rekorlar düğmesi oyun kartlarının altında ortalanır', async ({ page }) => {
  await page.goto('/#oyunlar');
  const navBox = await page.locator('#mode-screen .screen-nav').boundingBox();
  const recordBox = await page.locator('#records-button').boundingBox();
  const secondCardBox = await page.locator('.mode-card').nth(1).boundingBox();
  const thirdCardBox = await page.locator('.mode-card').nth(2).boundingBox();

  expect(navBox).not.toBeNull();
  expect(recordBox).not.toBeNull();
  expect(secondCardBox).not.toBeNull();
  expect(thirdCardBox).not.toBeNull();
  expect(recordBox.y).toBeGreaterThan(secondCardBox.y + secondCardBox.height);
  expect(recordBox.y).toBeGreaterThan(navBox.y + navBox.height);

  const middleCardsCenter = (secondCardBox.x + secondCardBox.width / 2 + thirdCardBox.x + thirdCardBox.width / 2) / 2;
  const recordCenter = recordBox.x + recordBox.width / 2;
  expect(Math.abs(recordCenter - middleCardsCenter)).toBeLessThan(3);
});

test('tablet dokunma hareketiyle sayfalar arasında ilerler ve geri döner', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#welcome-screen .screen-nav button small').last()).toBeVisible();
  await page.locator('#welcome-screen').evaluate((screen) => {
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'changedTouches', { value: [{ clientX: 700, clientY: 500 }] });
    screen.dispatchEvent(start);
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 120, clientY: 510 }] });
    screen.dispatchEvent(end);
  });
  await expect(page.locator('#tribute-screen')).toHaveClass(/is-active/);
  await page.locator('#tribute-screen').evaluate((screen) => {
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'changedTouches', { value: [{ clientX: 120, clientY: 500 }] });
    screen.dispatchEvent(start);
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 700, clientY: 510 }] });
    screen.dispatchEvent(end);
  });
  await expect(page.locator('#welcome-screen')).toHaveClass(/is-active/);
  await context.close();
});

test('masaüstünde kaydırma açıklamaları gizlidir ve sosyal etiketler hazırdır', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.screen-nav button small').last()).toBeHidden();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /linkedin-preview\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
});

test('81 il tamamlanınca sonuç kaydedilir ve paylaşılır', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => { window.__sharedResult = data; }
    });
  });
  await page.goto('/#oyunlar');
  await page.locator('[data-mode="fill"]').click();
  await page.locator('#start-game-button').click();
  await page.evaluate(async () => {
    const geo = await fetch('assets/turkiye_iller.geojson').then((response) => response.json());
    const form = document.querySelector('#answer-form');
    const input = document.querySelector('#answer-input');
    geo.features.forEach((feature) => {
      input.value = feature.properties.il_adi;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  });
  await expect(page.locator('#finish-dialog')).toBeVisible();
  await expect(page.locator('#finish-title')).toHaveText('81 ilin hepsi sende.');
  await page.locator('#save-time-yes').click();
  await expect(page.locator('#save-time-status')).toContainText('kaydedildi');
  await page.locator('#share-result').click();
  await expect.poll(() => page.evaluate(() => window.__sharedResult?.text)).toContain('81 / 81');
});
