import { expect, test } from '@playwright/test';

test('presents the approved home narrative in order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Mais que marketing, um sistema.',
  );
  await expect(page.locator('[data-copy-section]')).toHaveCount(12);
  await expect(page.locator('[data-copy-section]').first()).toHaveAttribute('id', 'antes-da-solucao');
  await expect(page.locator('[data-copy-section]').last()).toHaveAttribute('id', 'sobre');
});

test('keeps one dominant diagnostic action in the initial viewport', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('#promessa');
  await expect(hero.getByRole('link', { name: 'Solicitar diagnóstico', exact: true })).toHaveCount(1);
  await expect(hero.getByRole('link', { name: 'Conhecer nosso método', exact: true })).toBeVisible();
});

test('keeps one FAQ answer open and moves the selected question into the center', async ({ page }) => {
  await page.goto('/#faq');
  const faq = page.locator('#faq');
  await faq.scrollIntoViewIfNeeded();
  await expect(faq.locator('astro-island')).not.toHaveAttribute('ssr');
  const triggers = faq.locator('button[aria-expanded]');
  const first = triggers.nth(0);
  const second = triggers.nth(1);
  const firstAnswer = page.locator(`#${await first.getAttribute('aria-controls')}`);
  const secondAnswer = page.locator(`#${await second.getAttribute('aria-controls')}`);

  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(firstAnswer).toBeVisible();
  await expect(second).toHaveAttribute('aria-expanded', 'false');
  await expect(secondAnswer).toBeHidden();

  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(secondAnswer).toBeVisible();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(firstAnswer).toBeHidden();
  await expect(faq.locator('[data-position="center"] button')).toHaveAttribute('id', await second.getAttribute('id') as string);
  await expect(faq.locator('button[aria-expanded="true"]')).toHaveCount(1);
  await expect(faq.locator('[role="region"]:visible')).toHaveCount(1);

  // The expanded answer remains available when its own trigger is activated again.
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(secondAnswer).toBeVisible();
});

test('FAQ questions can be selected with the keyboard without losing focus', async ({ page }) => {
  await page.goto('/#faq');
  const faq = page.locator('#faq');
  await faq.scrollIntoViewIfNeeded();
  await expect(faq.locator('astro-island')).not.toHaveAttribute('ssr');
  const triggers = faq.locator('button[aria-expanded]');
  await triggers.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(triggers.nth(1)).toBeFocused();
  await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(triggers.nth(0)).toBeFocused();
  await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await expect(faq.locator('[role="region"]:visible')).toHaveCount(1);
});

test('mobile navigation exposes state, traps context and restores on Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  const trigger = page.locator('[data-menu-trigger]');
  const main = page.locator('main');
  const footer = page.locator('footer');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => main.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await expect.poll(() => footer.evaluate((element) => (element as HTMLElement).inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect.poll(() => main.evaluate((element) => (element as HTMLElement).inert)).toBe(false);
});

test('hero uses a decorative vector orbit with the official brand symbol', async ({ page }) => {
  await page.goto('/');
  const visual = page.locator('#promessa [data-hero-visual]');
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toBeVisible();
  await expect(visual).toHaveAttribute('aria-hidden', 'true');
  await expect(visual.locator('svg')).toHaveAttribute('viewBox', '0 0 720 620');
  await expect(visual.locator('svg image')).toHaveAttribute('href', '/brand/symbol-white.svg');
  const symbol = await page.request.get('/brand/symbol-white.svg');
  expect(symbol.ok()).toBe(true);
  expect(symbol.headers()['content-type']).toContain('image/svg+xml');
});

test('ambient hero motion pauses outside the viewport and resumes on return', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const visual = page.locator('#promessa [data-hero-visual]');
  const ribbon = visual.locator('.ribbon-one');
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute('data-in-view', 'true');
  await expect(ribbon).toHaveCSS('animation-name', 'hero-ribbon-a');
  await expect(ribbon).toHaveCSS('animation-play-state', 'running');

  await page.locator('#faq').scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute('data-in-view', 'false');
  await expect(ribbon).toHaveCSS('animation-play-state', 'paused');

  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute('data-in-view', 'true');
  await expect(ribbon).toHaveCSS('animation-play-state', 'running');
});

test('reduced motion leaves the hero static and FAQ selection functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const visual = page.locator('#promessa [data-hero-visual]');
  await visual.scrollIntoViewIfNeeded();
  await expect(visual).toHaveAttribute('data-in-view', 'true');
  await expect(visual.locator('.ribbon-one')).toHaveCSS('animation-name', 'none');
  await expect(visual.locator('svg')).toBeVisible();

  const faq = page.locator('#faq');
  await faq.scrollIntoViewIfNeeded();
  await expect(faq.locator('astro-island')).not.toHaveAttribute('ssr');
  const trigger = faq.locator('button[aria-expanded]').nth(1);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`#${await trigger.getAttribute('aria-controls')}`)).toBeVisible();
  await expect(faq.locator('[role="region"]:visible')).toHaveCount(1);
});
