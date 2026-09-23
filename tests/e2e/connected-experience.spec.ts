import { expect, test } from '@playwright/test';

const capabilities = [
  ['Estratégia e Diagnóstico', 'Pesquisa.', 'Explorar Estratégia', '/estrategia'],
  ['Branding e Posicionamento', 'Estratégia de marca.', 'Explorar Branding', '/branding'],
  ['Marketing e Conteúdo', 'Estratégia de marketing.', 'Explorar Marketing', '/marketing'],
  ['Sites e Experiências Digitais', 'Estratégia digital.', 'Explorar Digital', '/digital'],
  ['Performance', 'Planejamento.', null, null],
  ['CRM, Automação e Inteligência Artificial', 'CRM.', 'Explorar Tecnologia', '/tecnologia'],
] as const;

test('each capability exposes its approved specialties and destination through keyboard disclosure', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#capacidades');
  await expect(section.locator('article')).toHaveCount(capabilities.length);
  for (const [title, firstSpecialty, action, href] of capabilities) {
    const card = section.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    const summary = card.locator('summary');
    const specialty = card.getByText(firstSpecialty, { exact: true });
    await expect(specialty).toBeHidden();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(specialty).toBeVisible();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    if (action && href) await expect(card.getByRole('link', { name: action, exact: true })).toHaveAttribute('href', href);
    await page.keyboard.press('Space');
    await expect(specialty).toBeHidden();
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
  }
});

test('all six system disciplines expose one contextual answer and preserve keyboard focus', async ({ page }) => {
  await page.goto('/');
  const system = page.locator('[data-orbital]');
  const nodes = system.getByRole('group', { name: 'Disciplinas do sistema' }).getByRole('button');
  const names = ['Posicionamento', 'Marca', 'Conversão', 'Tecnologia', 'Digital', 'Aquisição'];
  await expect(nodes).toHaveText(names);
  for (let index = 0; index < names.length; index++) {
    const node = nodes.nth(index);
    await node.click();
    await expect(node).toHaveAttribute('aria-expanded', 'true');
    const detail = page.locator(`#${await node.getAttribute('aria-controls')}`);
    await expect(detail.getByRole('heading')).toHaveText(names[index]);
    await expect(detail.locator('p')).not.toBeEmpty();
    await expect(detail.getByRole('link')).toBeVisible();
    await expect(system.locator('button[aria-expanded="true"]')).toHaveCount(1);
  }
  await nodes.last().focus();
  await page.keyboard.press('ArrowRight');
  await expect(nodes.first()).toBeFocused();
  await expect(nodes.first()).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(nodes.last()).toBeFocused();
  await expect(nodes.last()).toHaveAttribute('aria-expanded', 'true');
});

test('mouse hover previews a discipline and restores the initial context when leaving', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  const system = page.locator('[data-orbital]');
  const nodes = system.locator('[data-orbit-node]');
  await nodes.nth(3).hover();
  await expect(nodes.nth(3)).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#um-unico-sistema h2').hover();
  await expect(nodes.first()).toHaveAttribute('aria-expanded', 'true');
});

test('marquee keeps every discipline readable and remains static under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const marquee = page.locator('.strategic-marquee');
  await marquee.scrollIntoViewIfNeeded();
  await expect(marquee.locator('.sr-only')).toHaveText('Estratégia, Posicionamento, Branding, Aquisição, Digital, Conversão, Tecnologia');
  await expect(marquee.locator('.marquee-set:visible')).toHaveCount(1);
  for (const word of ['Estratégia', 'Posicionamento', 'Branding', 'Aquisição', 'Digital', 'Conversão', 'Tecnologia']) {
    await expect(marquee.locator('.marquee-set:visible span').filter({ hasText: word })).toBeVisible();
  }
  await expect(marquee.locator('.marquee-track')).toHaveCSS('animation-play-state', 'paused');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
