import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const fillRequired = async (form: Locator) => {
  await form.getByLabel('Nome').fill('Pessoa Teste');
  await form.getByRole('textbox', { name: 'Email', exact: true }).fill('pessoa@example.com');
  await form.getByLabel('Empresa').fill('Empresa Teste');
  await form.getByLabel('Qual situação motivou este contato?').fill('A comunicação deixou de representar o momento atual da empresa.');
  await form.getByLabel('O que você gostaria que fosse diferente?').fill('Queremos uma direção clara para a marca, o site e o marketing.');
};

for (const route of ['/', '/diagnostico/']) {
test.describe(`diagnostic form at ${route}`, () => {
test('exposes every approved field and fails closed without production captcha config', async ({ page }) => {
  await page.goto(route);
  const form = page.getByRole('form', { name: 'Solicitação de diagnóstico' });
  for (const label of [
    'Nome', 'Empresa', 'Site ou perfil Opcional', 'Qual situação motivou este contato?',
    'O que você gostaria que fosse diferente?', 'O que já foi tentado? Opcional',
    'Existe algum prazo relevante? Opcional',
  ]) await expect(form.getByLabel(label, { exact: true })).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
  await expect(form.getByText('Como prefere continuar a conversa?', { exact: true })).toBeVisible();

  await fillRequired(form);
  await form.getByRole('button', { name: 'Enviar contexto' }).click();
  await expect(form.getByRole('status')).toContainText('proteção do formulário ainda não está configurada');
});

test('WhatsApp preference reveals and requires the visitor phone without publishing a company number', async ({ page }) => {
  await page.goto(route);
  const form = page.getByRole('form', { name: 'Solicitação de diagnóstico' });
  const phone = form.getByLabel('Seu WhatsApp com DDD');
  await expect(phone).toBeHidden();
  await form.getByLabel('WhatsApp', { exact: true }).check();
  await expect(phone).toBeVisible();
  await expect(phone).toHaveAttribute('required', '');
  await expect(page.locator('footer')).not.toContainText(/WhatsApp/i);
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
