import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// This audit uses an independent persistent preview and never stops the server.
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4322';
const widths = [320, 360, 375, 390, 430, 480, 640, 768, 820, 1024, 1280, 1366, 1440, 1600, 1920, 2560];
const captureSizes = new Map([[390, 844], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]);
const outputRoot = path.resolve(process.env.QA_OUTPUT ?? 'qa/responsive');
const buildRoot = path.resolve('.vercel/output/static');
const startedAt = new Date().toISOString();
const routes = [];
async function discover(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('_')) await discover(absolute);
    if (entry.isFile() && entry.name === 'index.html') {
      const relative = path.relative(buildRoot, directory).split(path.sep).join('/');
      routes.push(relative ? `/${relative}/` : '/');
    }
  }
}
await discover(buildRoot);
routes.push('/404.html');
routes.sort();
await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch();
const contexts = [];
const errors = new Map();
const matrix = [];
const screenshots = [];
const accessibility = [];
function logIssue(type, route, width, detail) {
  const key = `${type}:${detail}`;
  if (!errors.has(key)) errors.set(key, { type, detail, occurrences: [] });
  errors.get(key).occurrences.push({ route, width });
}
const jobs = widths.flatMap(width => routes.map(route => ({ width, route })));
let completed = 0;
async function worker() {
  const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
  contexts.push(context);
  const page = await context.newPage();
  let current;
  page.on('pageerror', error => logIssue('pageerror', current.route, current.width, error.message));
  page.on('console', message => { if (message.type() === 'error') logIssue('console', current.route, current.width, message.text()); });
  page.on('response', response => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document') logIssue('asset-response', current.route, current.width, `${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    const detail = request.failure()?.errorText;
    if (detail !== 'net::ERR_ABORTED') logIssue('requestfailed', current.route, current.width, `${detail} ${request.url()}`);
  });
  while ((current = jobs.shift())) {
    const { width, route } = current;
    const height = captureSizes.get(width) ?? (width < 768 ? 844 : 900);
    try {
      await page.setViewportSize({ width, height });
      const response = await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 }).catch(async error => {
        // A slow third party cannot hide an otherwise inspectable local page.
        if (page.url().startsWith(baseURL)) return null;
        throw error;
      });
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const viewport = window.innerWidth;
        const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewport;
        const offenders = overflow > 1 ? [...document.querySelectorAll('body *')].map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { tag: element.tagName, id: element.id, class: String(element.className?.baseVal ?? element.className), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), display: style.display, position: style.position };
        }).filter(item => item.display !== 'none' && item.width > 0 && (item.left < -1 || item.right > viewport + 1)).slice(0, 25) : [];
        return { overflow, documentHeight: document.documentElement.scrollHeight, h1Count: document.querySelectorAll('h1').length, offenders };
      });
      matrix.push({ route, width, height, status: response?.status() ?? 'navigation-timeout', ...layout });
      if (captureSizes.has(width)) {
        const filename = `${route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-|-$/g, '')}-${width}x${height}.png`;
        await page.screenshot({ path: path.join(outputRoot, filename), animations: 'disabled' });
        screenshots.push({ route, width, height, path: `qa/responsive/${filename}` });
      }
      if (route === '/' && [390, 1440].includes(width)) {
        for (const id of ['antes-da-solucao', 'nosso-metodo', 'capacidades', 'um-unico-sistema', 'faq']) {
          const section = page.locator(`#${id}`);
          if (await section.count()) {
            await section.scrollIntoViewIfNeeded();
            await page.waitForTimeout(120);
            const filename = `home-${id}-${width}.png`;
            await section.screenshot({ path: path.join(outputRoot, filename), animations: 'disabled' });
            screenshots.push({ route, section: id, width, path: `qa/responsive/${filename}` });
          }
        }
      }
    } catch (error) {
      matrix.push({ route, width, height, failure: error.message });
      logIssue('audit-failure', route, width, error.message);
    }
    completed += 1;
    if (completed % 20 === 0) console.log(`Responsive audit: ${completed}/${widths.length * routes.length}`);
  }
  await context.close();
}
// Two isolated pages keep capture memory bounded on long editorial routes.
await Promise.all([worker(), worker()]);

for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const route of ['/', '/diagnostico/', '/estrategia/', '/metodo/', '/privacidade/']) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, document.body.scrollHeight); });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollTo(0, 0));
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    accessibility.push({ route, width, violations: result.violations.map(violation => ({ id: violation.id, impact: violation.impact, description: violation.description, help: violation.help, helpUrl: violation.helpUrl, nodes: violation.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) })), incompleteCount: result.incomplete.length, passedRules: result.passes.length });
    console.log(`Accessibility audit: ${route} ${width}px — ${result.violations.length} violations`);
  }
  await context.close();
}
await browser.close();
matrix.sort((a, b) => a.width - b.width || a.route.localeCompare(b.route));
const report = { startedAt, completedAt: new Date().toISOString(), baseURL, routes, widths, captureSizes: [...captureSizes].map(([width, height]) => ({ width, height })), motionPreference: 'reduce for deterministic geometry and screenshots', summary: { checkedLayouts: matrix.length, expectedLayouts: widths.length * routes.length, overflowFailures: matrix.filter(row => row.overflow > 1).length, navigationFailures: matrix.filter(row => row.failure || ![200, 404].includes(row.status)).length, browserErrorGroups: errors.size, screenshots: screenshots.length, accessibilityRuns: accessibility.length, accessibilityViolationGroups: accessibility.reduce((sum, row) => sum + row.violations.length, 0) }, matrix, errors: [...errors.values()], screenshots, accessibility };
await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.overflowFailures || report.summary.navigationFailures || report.summary.browserErrorGroups || report.summary.accessibilityViolationGroups) process.exitCode = 1;
