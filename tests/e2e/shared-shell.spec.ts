import { expect, test } from '@playwright/test';

const exactNavigation = [
  ['Estratégia', '/estrategia'],
  ['Branding', '/branding'],
  ['Marketing', '/marketing'],
  ['Digital', '/digital'],
  ['Tecnologia', '/tecnologia'],
  ['Insights', '/insights'],
  ['Sobre', '/sobre'],
] as const;

test('desktop shell exposes the exact public navigation and one diagnostic action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  const links = navigation.getByRole('link');
  await expect(links).toHaveCount(exactNavigation.length);

  for (const [label, href] of exactNavigation) {
    await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
  }

  await expect(page.locator('header').getByRole('link', { name: 'Solicitar diagnóstico', exact: true })).toHaveAttribute(
    'href',
    '/diagnostico',
  );
});

test('footer publishes the approved email and social channels without inventing WhatsApp', async ({ page }) => {
  await page.goto('/');

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'bescheiben@gmail.com', exact: true })).toHaveAttribute(
    'href',
    'mailto:bescheiben@gmail.com',
  );

  const instagram = footer.getByRole('link', { name: 'Instagram da Bescheiben', exact: true });
  await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/bescheiben/');
  await expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');

  const linkedin = footer.getByRole('link', { name: 'LinkedIn da Bescheiben', exact: true });
  await expect(linkedin).toHaveAttribute(
    'href',
    'https://www.linkedin.com/company/bescheiben/?viewAsMember=true',
  );
  await expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(footer).not.toContainText(/WhatsApp/i);
});

test('document shell has one main landmark, one H1 and complete sharing metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('main#conteudo')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('body')).toHaveClass(/page-home/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0A0718');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/bescheiben\.com\.br\//);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /Bescheiben/);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /./);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /^https:\/\/bescheiben\.com\.br\//);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/brand/favicon.svg');
});

test('navigation collapses before crowded links can overflow and restores focus on Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 1190, height: 800 });
  await page.goto('/');

  const trigger = page.locator('[data-menu-trigger]');
  const mobilePanel = page.locator('[data-mobile-panel]');
  await expect(trigger).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(mobilePanel).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(mobilePanel.getByRole('link', { name: 'Estratégia', exact: true })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(mobilePanel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('visible focus and reduced-motion preferences remain effective', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  const computed = await skipLink.evaluate((element) => {
    const style = getComputedStyle(element);
    const duration = style.transitionDuration.endsWith('ms')
      ? Number.parseFloat(style.transitionDuration)
      : Number.parseFloat(style.transitionDuration) * 1000;
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      transitionDurationMs: duration,
    };
  });

  expect(computed.outlineStyle).not.toBe('none');
  expect(computed.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(computed.transitionDurationMs).toBeLessThanOrEqual(0.01);
});
