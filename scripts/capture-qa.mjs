import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321';
const outputDirectory = resolve('.preview', 'qa');
const pages = [
  { slug: 'home', path: '/' },
  { slug: 'estrategia', path: '/estrategia/' },
  { slug: 'posicionamento', path: '/estrategia/posicionamento/' },
  { slug: 'metodo', path: '/metodo/' },
  { slug: 'insights', path: '/insights/' },
  { slug: 'diagnostico', path: '/diagnostico/' },
  { slug: 'bescheiben', path: '/bescheiben/' },
  { slug: 'privacidade', path: '/privacidade/' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      hasTouch: viewport.isMobile,
      isMobile: viewport.isMobile,
      locale: 'pt-BR',
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));

    for (const entry of pages) {
      runtimeErrors.length = 0;
      const response = await page.goto(`${baseURL}${entry.path}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`${entry.path} returned ${response?.status() ?? 'no response'}`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${entry.path} overflows horizontally by ${overflow}px at ${viewport.name}`);

      const screenshot = resolve(outputDirectory, `${entry.slug}-${viewport.name}.png`);
      await page.screenshot({
        path: resolve(outputDirectory, `${entry.slug}-${viewport.name}-fold.png`),
        fullPage: false,
        animations: 'disabled',
      });
      await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
      report.push({ route: entry.path, viewport: viewport.name, screenshot, runtimeErrors: [...runtimeErrors] });
      if (runtimeErrors.length > 0) throw new Error(`${entry.path} emitted ${runtimeErrors.join('; ')}`);
    }

    if (viewport.name === 'desktop') {
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.locator('[data-strategy-trigger]').click();
      report.push({
        route: '/',
        viewport: 'desktop-strategy-dropdown',
        visibleLinks: await page.locator('[data-strategy-panel] a:visible').count(),
      });
      await page.screenshot({
        path: resolve(outputDirectory, 'dropdown-desktop.png'),
        fullPage: false,
        animations: 'disabled',
      });
    }

    if (viewport.name === 'mobile') {
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.locator('[data-menu-trigger]').click();
      report.push({
        route: '/',
        viewport: 'mobile-menu',
        brand: await page.locator('.brand img').evaluate((image) => ({
          visible: image.checkVisibility(),
          currentSrc: image.currentSrc,
          naturalWidth: image.naturalWidth,
          bounds: image.getBoundingClientRect().toJSON(),
        })),
      });
      await page.screenshot({
        path: resolve(outputDirectory, 'menu-mobile.png'),
        fullPage: false,
        animations: 'disabled',
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
