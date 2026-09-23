import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const integrity = JSON.parse(await readFile('qa/content-integrity.json', 'utf8'));
const routes = integrity.routeArtifacts.map(({ route }) => route);
const browser = await chromium.launch();
const context = await browser.newContext({ javaScriptEnabled: false });
await context.route('**/*', route => route.abort());
const page = await context.newPage();
const documents = new Map();
const outputRoot = resolve('.vercel/output/static');
for (const route of routes) {
  await page.setContent(await readFile(resolve(outputRoot, `.${route}`, 'index.html'), 'utf8'), { waitUntil: 'domcontentloaded' });
  documents.set(route, await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map(node => node.id),
    links: [...document.querySelectorAll('a[href]')].map(node => ({ href: node.getAttribute('href'), text: node.textContent.trim(), ariaLabel: node.getAttribute('aria-label') })),
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  })));
}
await browser.close();
const broken = [];
const duplicateIds = [];
let internalLinkCount = 0;
let anchorCount = 0;
const external = new Set();
for (const [route, document] of documents) {
  const repeated = [...new Set(document.ids.filter((id, index) => document.ids.indexOf(id) !== index))];
  if (repeated.length) duplicateIds.push({ route, ids: repeated });
  for (const link of document.links) {
    const url = new URL(link.href, `https://bescheiben.com.br${route === '/' ? '/' : `${route}/`}`);
    if (url.origin !== 'https://bescheiben.com.br') {
      external.add(url.href);
      continue;
    }
    internalLinkCount++;
    const targetRoute = url.pathname.replace(/\/$/, '') || '/';
    const target = documents.get(targetRoute);
    if (!target && !(await stat(resolve(outputRoot, `.${url.pathname}`)).catch(() => null))?.isFile()) broken.push({ route, ...link, reason: 'Missing route or local asset' });
    if (url.hash && target) {
      anchorCount++;
      if (!target.ids.includes(decodeURIComponent(url.hash.slice(1)))) broken.push({ route, ...link, reason: 'Missing anchor' });
    }
  }
}
const report = {
  auditedAt: new Date().toISOString(),
  builtAt: (await stat(resolve(outputRoot, 'index.html'))).mtime.toISOString(),
  methodology: 'Read-only DOM inspection of generated HTML with JavaScript and network disabled. Every internal href is resolved to its generated route or asset; fragment destinations are checked against actual IDs. External URL availability is not tested.',
  routeCount: routes.length,
  internalLinkCount,
  anchorCount,
  external: [...external],
  duplicateIds,
  broken,
};
await writeFile('qa/preservation-links.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (broken.length || duplicateIds.length) process.exitCode = 1;
