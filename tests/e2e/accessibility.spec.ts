import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/estrategia/',
  '/branding/',
  '/marketing/',
  '/digital/',
  '/tecnologia/',
  '/insights/',
  '/diagnostico/',
  '/sobre/',
  '/privacidade/',
  '/cookies/',
  '/termos/',
  '/acessibilidade/',
  '/404.html',
];

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const route of routes) {
  test(`${route} has no automatically detectable WCAG 2.2 A or AA violations`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

test('open mobile navigation has no automatically detectable violations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.locator('[data-menu-trigger]').click();

  const results = await new AxeBuilder({ page })
    .include('#mobile-menu')
    .withTags(wcagTags)
    .analyze();

  expect(results.violations).toEqual([]);
});
