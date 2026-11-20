import { chromium } from '@playwright/test';
import ffmpegPath from 'ffmpeg-static';
import { mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const port = 4180;
const baseURL = `http://127.0.0.1:${port}`;
const screenshots = join(process.cwd(), 'docs', 'screenshots');
const demoDir = join(process.cwd(), 'docs', 'demo');
await mkdir(screenshots, { recursive: true });
await mkdir(demoDir, { recursive: true });

const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore',
  windowsHide: true
});

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${code} koduyla kapandı.`)));
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch { /* Sunucu henüz hazır değil. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Test sunucusu başlatılamadı.');
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    recordVideo: { dir: demoDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.screenshot({ path: join(screenshots, 'ana-sayfa.png') });
  await page.waitForTimeout(1800);
  await page.locator('.press-key').click();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: 'Oyunları keşfet' }).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(screenshots, 'oyun-secimi.png') });
  await page.locator('[data-mode="fill"]').click();
  await page.locator('#start-game-button').waitFor({ state: 'visible' });
  await page.waitForTimeout(1400);
  await page.locator('#start-game-button').click();
  for (const city of ['Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Antalya']) {
    await page.locator('#answer-input').fill(city);
    await page.locator('#answer-form').evaluate((form) => form.requestSubmit());
    await page.waitForTimeout(850);
  }
  await page.screenshot({ path: join(screenshots, 'oyun-ekrani.png') });
  await page.waitForTimeout(1800);
  await page.locator('#exit-button').click();
  await page.waitForTimeout(900);
  await page.locator('#exit-finish').click();
  await page.waitForTimeout(1700);
  const video = page.video();
  await context.close();
  const rawVideo = await video.path();
  const linkedInVideo = join(demoDir, 'turkiye-harita-oyunu-linkedin.mp4');
  await rm(linkedInVideo, { force: true });
  await run(ffmpegPath, ['-y', '-i', rawVideo, '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', linkedInVideo]);
  await rm(rawVideo, { force: true });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseURL}/#oyunlar`);
  await mobilePage.screenshot({ path: join(screenshots, 'mobil-oyun-secimi.png'), fullPage: true });
  await mobile.close();
  await browser.close();
  process.stdout.write(`Vitrin dosyaları oluşturuldu: ${screenshots} ve ${linkedInVideo}\n`);
} finally {
  server.kill();
}
