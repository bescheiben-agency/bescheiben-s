import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4322';
const output = process.env.QA_OUTPUT ?? path.join(tmpdir(), 'bescheiben-targeted-review');
const widths = [1920, 1440, 1366, 1024, 768, 430, 390, 360];
const routes = ['/', '/estrategia/', '/branding/', '/marketing/', '/digital/', '/tecnologia/', '/sobre/', '/diagnostico/'];
const rows = [];
const browserErrors = [];
const browserSmoke = [];
await mkdir(output, { recursive: true });

function observeErrors(page, context) {
  page.on('pageerror', error => browserErrors.push({ ...context, type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push({ ...context, type: 'console', message: message.text() });
  });
}

async function reviewPage(page, route, width, mode) {
  const response = await page.goto(baseURL + route, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  const state = await page.evaluate(() => {
    const main = document.querySelector('main');
    const h1 = main?.querySelector('h1');
    const important = [...(main?.querySelectorAll('h1,h2,h3,.hero-art svg,.system-network,.method-scene,.symptom-anchor__visual') ?? [])]
      .filter(element => {
        const style = getComputedStyle(element);
        return style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .01;
      }).map(element => element.tagName.toLowerCase() + (element.className?.baseVal ?? element.className ?? ''));
    const sticky = [...document.querySelectorAll('body *')]
      .filter(element => getComputedStyle(element).position === 'sticky' && !element.matches('.site-header'))
      .map(element => element.tagName.toLowerCase() + (element.className?.baseVal ?? element.className ?? ''));
    const textOverflows = [...document.querySelectorAll('.system-stage h3')]
      .filter(element => element.scrollWidth - element.clientWidth > 1)
      .map(element => element.textContent?.trim());
    const form = document.querySelector('[data-diagnostic-form]');
    const visibleFields = form ? [...form.querySelectorAll('input:not([type=hidden]),textarea')]
      .filter(element => !element.closest('.trap') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map(element => element.getAttribute('name')) : [];
    const words = (main?.innerText ?? '').match(/\S+/g)?.length ?? 0;
    const heroGraphic = main?.querySelector('.hero-art svg');
    const graphicStyle = heroGraphic && getComputedStyle(heroGraphic);
    return {
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      h1Visible: Boolean(h1 && h1.getClientRects().length && Number(getComputedStyle(h1).opacity) > .01),
      graphicVisible: Boolean(heroGraphic && heroGraphic.getClientRects().length && graphicStyle?.visibility !== 'hidden' && graphicStyle?.display !== 'none'),
      importantHidden: important,
      sticky,
      textOverflows,
      visibleFields,
      words,
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      ribbonAnimation: getComputedStyle(document.querySelector('.ribbon-one') ?? document.body).animationName,
      threeEnabled: document.querySelector('[data-three-orbit]')?.getAttribute('data-enabled') ?? null,
      sections: [...document.querySelectorAll('[data-copy-section]')].map(element => ({ id: element.id, height: Math.round(element.getBoundingClientRect().height) })),
    };
  });
  const row = { route, width, mode, status: response?.status(), ...state };
  rows.push(row);
  return row;
}

const browser = await chromium.launch();
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const contextLabel = { browser: 'Chromium', width, mode: 'normal' };
  observeErrors(page, contextLabel);
  for (const route of routes) {
    const row = await reviewPage(page, route, width, 'normal');
    if (['/', '/diagnostico/'].includes(route) && [1440, 390].includes(width)) {
      const name = (route === '/' ? 'home' : 'diagnostico') + '-' + width + '-normal.png';
      await page.screenshot({ path: path.join(output, name), fullPage: true, animations: 'disabled' });
      if (route === '/') for (const id of ['antes-da-solucao', 'nosso-metodo', 'capacidades', 'um-unico-sistema', 'faq', 'formulario']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await page.waitForTimeout(80);
        await page.screenshot({ path: path.join(output, 'home-' + id + '-' + width + '.png'), animations: 'disabled' });
      }
    }
    if (row.status !== 200) browserErrors.push({ ...contextLabel, route, type: 'status', message: String(row.status) });
  }
  await context.close();
  console.log('Reviewed ' + width + 'px across ' + routes.length + ' routes');
}
for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  observeErrors(page, { browser: 'Chromium', width, mode: 'reduce' });
  for (const route of ['/', '/diagnostico/']) {
    await reviewPage(page, route, width, 'reduce');
    const name = (route === '/' ? 'home' : 'diagnostico') + '-' + width + '-reduce.png';
    await page.screenshot({ path: path.join(output, name), fullPage: true, animations: 'disabled' });
  }
  await context.close();
}
await browser.close();

for (const [name, executablePath] of [
  ['Edge', process.env.EDGE_EXECUTABLE ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'],
  ['Opera', process.env.OPERA_EXECUTABLE ?? path.join(homedir(), 'AppData', 'Local', 'Programs', 'Opera', 'opera.exe')],
]) {
  if (!existsSync(executablePath)) {
    browserSmoke.push({ browser: name, skipped: 'Browser executable not installed' });
    continue;
  }
  try {
    const variant = await chromium.launch({ executablePath, headless: true });
    for (const mode of ['normal', 'reduce']) {
      const context = await variant.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      observeErrors(page, { browser: name, width: 1440, mode });
      const row = await reviewPage(page, '/', 1440, mode);
      browserSmoke.push({ browser: name, mode, status: row.status, graphicVisible: row.graphicVisible, h1Visible: row.h1Visible, ribbonAnimation: row.ribbonAnimation });
      await context.close();
    }
    await variant.close();
  } catch (error) {
    browserSmoke.push({ browser: name, unavailable: String(error) });
  }
}

const failures = rows.filter(row => row.status !== 200 || row.overflow > 1 || !row.h1Visible || !row.graphicVisible || row.importantHidden.length || row.sticky.length || row.textOverflows.length || (['/', '/diagnostico/'].includes(row.route) && row.visibleFields.length !== 4));
const report = { auditedAt: new Date().toISOString(), baseURL, output, widths, routes, summary: { checks: rows.length, failures: failures.length, browserErrors: browserErrors.length }, failures, browserErrors, browserSmoke, rows };
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, summary: report.summary, failures, browserErrors, browserSmoke, wordCounts: rows.filter(row => row.width === 1440 && row.mode === 'normal' && routes.includes(row.route)).slice(0, routes.length).map(({ route, words }) => ({ route, words })), homeSections: rows.find(row => row.width === 390 && row.route === '/')?.sections }, null, 2));
if (failures.length || browserErrors.length || browserSmoke.some(row => row.unavailable || row.status !== 200 || !row.graphicVisible || !row.h1Visible)) process.exitCode = 1;
