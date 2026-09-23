import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { chromium } from '@playwright/test';

const normalize = (value) => value.normalize('NFC').replace(/\s+/g, '');
const masterPath = 'src/content/master/Bescheiben_Copy_Master_Final_SEO_AEO_GEO.md';
const master = await readFile('src/content/master/Bescheiben_Copy_Master_Final_SEO_AEO_GEO.md', 'utf8');
const source = (await readFile('src/content/site-content.ts', 'utf8'))
  .replace(/^import masterCopy[^\r\n]+/, `const masterCopy = ${JSON.stringify(master)};`);
const loadTypeScript = (code) => import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`);
const { siteContent } = await loadTypeScript(source);
const { parseMasterMarkdown, plainText } = await loadTypeScript(await readFile('src/utils/master-markdown.ts', 'utf8'));
const baseline = JSON.parse(await readFile('docs/redesign-2026/preserved-baseline.json', 'utf8'));
const hashes = await Promise.all(baseline.map(async ({ Path, Hash }) => {
  const file = Path.includes('\\site\\') ? Path.split('\\site\\')[1].replaceAll('\\', '/') : masterPath;
  return { file, expected: Hash, actual: createHash('sha256').update(await readFile(file)).digest('hex').toUpperCase() };
}));
hashes.forEach((entry) => { entry.match = entry.actual === entry.expected; });
const diagnosticBaseline = await readFile('docs/redesign-2026/diagnostic-baseline.txt', 'utf8');
const contactSource = await readFile('src/components/ContactSection.astro', 'utf8');
const inlineScript = (source) => [...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(match => match[1].trim()).join('\n');
const oldSuccess = 'Contexto recebido. Vamos analisar as informações antes de continuar a conversa.';
const approvedSuccess = `${oldSuccess} Caso seja necessário compreender algum ponto adicional, entraremos em contato.`;
const formContract = {
  scriptMatchesBaselineExceptApprovedSuccessCopy: inlineScript(contactSource) === inlineScript(diagnosticBaseline).replace(oldSuccess, approvedSuccess),
  approvedSuccess,
  fieldsMatchBaseline: false,
  helpAssociationsValid: false,
};

const browser = await chromium.launch();
const context = await browser.newContext({ javaScriptEnabled: false });
const page = await context.newPage();
await page.route('**/*', route => route.abort());
const routes = [];
for (const [route, content] of Object.entries(siteContent)) {
  const file = resolve('.vercel/output/static', `.${route}`, 'index.html');
  await page.setContent(await readFile(file, 'utf8'), { waitUntil: 'domcontentloaded' });
  const document = await page.evaluate(() => ({
    text: window.document.body.textContent,
    hero: window.document.querySelector('.page-hero')?.textContent,
    finalCta: window.document.querySelector('.final-cta')?.textContent,
    faq: window.document.querySelector('#faq')?.textContent,
    contactIntro: window.document.querySelector('.contact-intro')?.textContent,
    form: window.document.querySelector('[data-diagnostic-form]')?.textContent,
    title: window.document.title,
    description: window.document.querySelector('meta[name="description"]')?.content,
    canonical: window.document.querySelector('link[rel="canonical"]')?.href,
    schema: [...window.document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)),
    sections: Object.fromEntries([...window.document.querySelectorAll('[data-copy-section]')].map(section => [section.id, section.textContent])),
    faqCount: window.document.querySelectorAll('[data-faq-item]').length,
  }));
  const result = { route, expectedSections: content.sections.length, renderedSections: route === '/diagnostico' ? 3 : Object.keys(document.sections).length, sectionRenderer: route === '/diagnostico' ? 'ContactSection: intro, fields, conditional confirmation' : 'data-copy-section', expectedFaqs: content.faqs.length, renderedFaqs: document.faqCount, checkedCopyUnits: 0, missing: [], seo: document.title === content.seo.title && document.description === content.seo.description && document.canonical?.replace(/\/$/, '') === `https://bescheiben.com.br${route}`.replace(/\/$/, '') && document.schema.length > 0 };
  const check = (text, container, location) => {
    result.checkedCopyUnits++;
    if (!normalize(container ?? '').includes(normalize(text))) result.missing.push({ location, text });
  };
  [...content.hero.heading, ...content.hero.supportingCopy].forEach(text => check(text, document.hero, 'hero'));
  if (route !== '/diagnostico') {
    for (const section of content.sections) {
      if (!/^SEÇÃO\s+\d+/.test(section.heading)) check(section.heading, document.sections[section.id], `${section.id}:heading`);
      const blocks = parseMasterMarkdown(section.body);
      for (const block of blocks) {
        if ('text' in block) {
          const decorative = ['FECHO', 'MAPA DO SISTEMA', '↓'].includes(block.text.toUpperCase()) || /^\d+$/.test(block.text);
          const label = block.type === 'eyebrow' && !(section.id === 'nosso-metodo' && block !== blocks[0]);
          if (!decorative && !label) check(block.text, document.sections[section.id], section.id);
        } else block.items.forEach(text => check(text, document.sections[section.id], section.id));
      }
    }
    for (const item of content.faqs) { check(item.question, document.faq, 'faq'); check(plainText(item.answer), document.faq, 'faq'); }
    if (content.finalCta) for (const block of parseMasterMarkdown(content.finalCta.body)) {
      if ('text' in block && block.type !== 'eyebrow') check(block.text, document.finalCta, 'final-cta');
      else if ('items' in block) block.items.forEach(text => check(text, document.finalCta, 'final-cta'));
    }
  } else {
    for (const section of content.sections) {
      const target = section.id === 'antes-do-formulario' ? document.contactIntro : section.id === 'confirmacao' ? inlineScript(contactSource) : document.form;
      for (const block of parseMasterMarkdown(section.body)) {
        if ('text' in block && block.text !== 'Opcional.') check(block.text, target, section.id);
      }
    }
    formContract.helpAssociationsValid = await page.evaluate(() => [...window.document.querySelectorAll('.field-help[id]')].length === 6 && [...window.document.querySelectorAll('.field-help[id]')].every(help => window.document.querySelector(`[aria-describedby="${help.id}"]`)));
  }
  routes.push(result);
}
const collectFields = async (source) => {
  await page.setContent(source, { waitUntil: 'domcontentloaded' });
  return page.locator('[data-diagnostic-form]').evaluate(form => [...form.querySelectorAll('input,textarea')].map(field => Object.fromEntries(['name', 'type', 'value', 'required', 'minlength', 'maxlength', 'autocomplete', 'inputmode'].map(attribute => [attribute, field.getAttribute(attribute)]))));
};
formContract.fieldsMatchBaseline = JSON.stringify(await collectFields(diagnosticBaseline)) === JSON.stringify(await collectFields(contactSource));
await browser.close();
const artifactRoutes = [...Object.keys(siteContent), '/privacidade', '/cookies', '/termos', '/acessibilidade', '/metodo', '/bescheiben', '/estrategia/posicionamento', '/estrategia/marca', '/estrategia/aquisicao', '/estrategia/conversao'];
const routeArtifacts = await Promise.all(artifactRoutes.map(async route => ({ route, exists: (await stat(resolve('.vercel/output/static', `.${route}`, 'index.html')).catch(() => null))?.isFile() === true })));
const builtAt = (await stat('.vercel/output/static/index.html')).mtime.toISOString();
const report = { auditedAt: new Date().toISOString(), builtAt, methodology: 'Exact copy comparisons after NFC and whitespace normalization against production SSR HTML. Hero, FAQ and CTA checks are scoped to their rendered containers, not scripts/JSON-LD. Includes initially hidden method/FAQ panels and capability disclosures. Decorative labels and step numerals are excluded. Diagnostic helpers and intro use rendered HTML; conditional success copy uses its original inline script. Backend/schema/master hashes use portable local paths from the preserved baseline.', hashes, formContract, routeArtifacts, routes };
await writeFile('qa/content-integrity.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ builtAt, hashesMatch: hashes.every(entry => entry.match), formContract, routeArtifacts, routes }, null, 2));
if (hashes.some(entry => !entry.match) || routeArtifacts.some(route => !route.exists) || !formContract.scriptMatchesBaselineExceptApprovedSuccessCopy || !formContract.fieldsMatchBaseline || !formContract.helpAssociationsValid || routes.some(route => route.missing.length || !route.seo || route.expectedSections !== route.renderedSections || route.expectedFaqs !== route.renderedFaqs)) process.exitCode = 1;
