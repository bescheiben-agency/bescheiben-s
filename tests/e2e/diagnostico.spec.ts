import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const fillRequired = async (form: Locator) => {
  await form.getByLabel('Nome').fill('Pessoa Teste');
  await form.getByRole('textbox', { name: 'E-mail', exact: true }).fill('pessoa@example.com');
  await form.getByLabel('O que está acontecendo?').fill('A comunicação deixou de representar o momento atual da empresa.');
};

for (const route of ['/', '/diagnostico/']) {
test.describe(`diagnostic form at ${route}`, () => {
test('exposes four compact fields and fails closed without production captcha config', async ({ page }) => {
  await page.goto(route);
  const form = page.getByRole('form', { name: 'Solicitação de diagnóstico' });
  for (const label of ['Nome', 'Empresa Opcional', 'O que está acontecendo?']) {
    await expect(form.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(form.getByRole('textbox', { name: 'E-mail', exact: true })).toBeVisible();
  await expect(form.getByRole('textbox')).toHaveCount(4);

  await fillRequired(form);
  await form.getByRole('button', { name: 'Enviar contexto' }).click();
  await expect(form.getByRole('status')).toContainText('O envio está temporariamente indisponível');
});

test('successful delivery shows confirmation and prevents a duplicate draft submission', async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  await page.route('**/api/diagnostico', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, message: 'Contexto recebido.' }),
  }));
  await page.goto(route);
  const form = page.getByRole('form', { name: 'Solicitação de diagnóstico' });
  await form.evaluate((element) => { (element as HTMLElement).dataset.turnstileConfigured = 'true'; });
  await form.locator('[data-turnstile-token]').evaluate((element) => { (element as HTMLInputElement).value = 'test-token'; });
  // Turnstile adds this field by default in a configured environment.
  await form.evaluate((element) => {
    const response = document.createElement('input');
    response.type = 'hidden';
    response.name = 'cf-turnstile-response';
    response.value = 'test-token';
    element.append(response);
  });
  page.on('request', (request) => {
    if (request.url().endsWith('/api/diagnostico')) payloads.push(request.postDataJSON());
  });
  await fillRequired(form);
  await form.getByRole('button', { name: 'Enviar contexto' }).click();
  await expect(form.getByRole('status')).toContainText('Contexto recebido');
  await expect(form.getByLabel('Nome')).toBeHidden();
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({ name: 'Pessoa Teste', email: 'pessoa@example.com', company: '' });
  expect(payloads[0]).not.toHaveProperty('desiredChange');
  expect(payloads[0]).not.toHaveProperty('cf-turnstile-response');
});

test('recoverable provider failure preserves the visitor draft', async ({ page }) => {
  await page.route('**/api/diagnostico', async (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, message: 'Não foi possível enviar agora.' }),
  }));
  await page.goto(route);
  const form = page.getByRole('form', { name: 'Solicitação de diagnóstico' });
  await form.evaluate((element) => {
    const widget = document.createElement('div');
    widget.className = 'cf-turnstile';
    element.append(widget);
    Object.assign(window, { turnstile: { reset(target: HTMLElement) { target.dataset.reset = 'true'; } } });
  });
  await form.evaluate((element) => { (element as HTMLElement).dataset.turnstileConfigured = 'true'; });
  await form.locator('[data-turnstile-token]').evaluate((element) => { (element as HTMLInputElement).value = 'test-token'; });
  await fillRequired(form);
  await form.getByRole('button', { name: 'Enviar contexto' }).click();
  await expect(form.getByRole('status')).toContainText('Não foi possível enviar agora');
  await expect(form.getByLabel('Nome')).toHaveValue('Pessoa Teste');
  await expect(form.locator('[data-turnstile-token]')).toHaveValue('');
  await expect(form.locator('.cf-turnstile')).toHaveAttribute('data-reset', 'true');
});
});
}
