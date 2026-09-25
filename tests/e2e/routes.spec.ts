import { expect, test } from '@playwright/test';

const routes = [
  ['/', 'Mais que marketing, um sistema.'],
  ['/estrategia/', 'Antes de decidir o que fazer, descubra o que realmente precisa mudar.'],
  ['/branding/', 'Antes de mudar a aparência da marca, decida o que ela precisa significar.'],
  ['/marketing/', 'Pare de produzir para preencher espaços. Comece a comunicar com uma função.'],
  ['/digital/', 'Seu site precisa ajudar alguém a escolher sua empresa.'],
  ['/tecnologia/', 'Automatizar um processo ruim apenas acelera o problema.'],
  ['/insights/', 'Ideias para quem precisa tomar decisões melhores.'],
  ['/sobre/', 'Não queríamos construir apenas mais uma agência.'],
] as const;

for (const [route, heading] of routes) {
  test(`${route} renders approved master copy and complete route shell`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('main#conteudo')).toHaveCount(1);
    await expect(page.locator('[data-copy-section]')).not.toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/Copy provisória|SEÇÃO 0\d|conteúdo demonstrativo/i);
    await expect(page.getByRole('link', { name: 'Solicitar diagnóstico', exact: true }).first()).toHaveAttribute('href', '/diagnostico');
  });
}

test('home preserves all twelve approved narrative sections and eight FAQs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-copy-section]')).toHaveCount(12);
  await expect(page.locator('#faq [data-faq-item]')).toHaveCount(8);
  await expect(page.getByText('A Bescheiben não começa perguntando o que você quer fazer.', { exact: true })).toBeVisible();
});

test('insights does not invent article cards, dates or authors', async ({ page }) => {
  await page.goto('/insights/');
  await expect(page.locator('.insight-card, article time')).toHaveCount(0);
  await expect(page.locator('#conteudos')).toBeVisible();
});
