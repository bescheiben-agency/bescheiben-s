import { describe, expect, it, vi } from 'vitest';
import { buildDiagnosticEmail } from '../../src/lib/contact/email';
import { handleDiagnosticRequest } from '../../src/lib/contact/handler';
import { verifyTurnstileToken } from '../../src/lib/contact/turnstile';
import { validateDiagnosticSubmission } from '../../src/lib/contact/validation';

const now = 1_800_000_000_000;
const valid = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  company: 'Empresa Exemplo',
  website: 'https://example.com',
  situation: 'A marca cresceu, mas a comunicação deixou de representar a empresa.',
  desiredChange: 'Queremos construir uma direção clara para marca, site e marketing.',
  attempted: 'Reorganizamos o calendário e revisamos algumas mensagens.',
  deadline: 'Próximo trimestre.',
  contactPreference: 'email',
  phone: '',
  turnstileToken: 'test-token',
  websiteTrap: '',
  startedAt: String(now - 10_000),
};

const request = (body: unknown, init: RequestInit = {}) => new Request('https://bescheiben.com.br/api/diagnostico', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://bescheiben.com.br', ...(init.headers ?? {}) },
  body: JSON.stringify(body),
  ...init,
});

describe('diagnostic validation', () => {
  it('accepts a complete email submission and normalizes fields', () => {
    const result = validateDiagnosticSubmission(valid, now);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.email).toBe('ana@example.com');
  });

  it('rejects unknown fields, honeypot, too-fast submission and oversized token', () => {
    expect(validateDiagnosticSubmission({ ...valid, admin: true }, now).ok).toBe(false);
    expect(validateDiagnosticSubmission({ ...valid, websiteTrap: 'spam' }, now).ok).toBe(false);
    expect(validateDiagnosticSubmission({ ...valid, startedAt: String(now - 500) }, now).ok).toBe(false);
    expect(validateDiagnosticSubmission({ ...valid, turnstileToken: 'x'.repeat(2049) }, now).ok).toBe(false);
  });

  it('requires a plausible phone only when WhatsApp is selected', () => {
    expect(validateDiagnosticSubmission({ ...valid, contactPreference: 'whatsapp', phone: '' }, now).ok).toBe(false);
    expect(validateDiagnosticSubmission({ ...valid, contactPreference: 'whatsapp', phone: '+55 11 99999-9999' }, now).ok).toBe(true);
  });
});

describe('diagnostic email', () => {
  it('escapes user HTML and includes text and reply context', () => {
    const parsed = validateDiagnosticSubmission({ ...valid, name: '<script>alert(1)</script> Ana' }, now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const email = buildDiagnosticEmail(parsed.data);
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.text).toContain('<script>alert(1)</script> Ana');
    expect(email.replyTo).toBe('ana@example.com');
  });
});

describe('diagnostic HTTP handler', () => {
  const deps = () => ({
    now: () => now,
    expectedOrigin: 'https://bescheiben.com.br',
    toEmail: 'bescheiben@gmail.com',
    limitSubmission: vi.fn().mockResolvedValue({ success: true, retryAfterSeconds: 0 }),
    verifyTurnstile: vi.fn().mockResolvedValue(true),
    sendEmail: vi.fn().mockResolvedValue({ id: 'email-id' }),
  });

  it('fails closed for wrong method/content type/origin and oversized bodies', async () => {
    expect((await handleDiagnosticRequest(new Request('https://bescheiben.com.br/api/diagnostico'), deps())).status).toBe(405);
    expect((await handleDiagnosticRequest(request(valid, { headers: { 'content-type': 'text/plain', origin: 'https://bescheiben.com.br' } }), deps())).status).toBe(415);
    expect((await handleDiagnosticRequest(request(valid, { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } }), deps())).status).toBe(403);
    expect((await handleDiagnosticRequest(request(valid, { headers: { 'content-type': 'application/json', origin: 'https://bescheiben.com.br', 'content-length': '70000' } }), deps())).status).toBe(413);
  });

  it('rejects invalid Turnstile and provider failure with generic errors', async () => {
    const captchaDeps = deps();
    captchaDeps.verifyTurnstile.mockResolvedValue(false);
    const captchaResponse = await handleDiagnosticRequest(request(valid), captchaDeps);
    expect(captchaResponse.status).toBe(400);
    expect(await captchaResponse.text()).not.toContain('Turnstile');

    const mailDeps = deps();
    mailDeps.sendEmail.mockRejectedValue(new Error('provider secret'));
    const mailResponse = await handleDiagnosticRequest(request(valid), mailDeps);
    expect(mailResponse.status).toBe(503);
    expect(await mailResponse.text()).not.toContain('provider secret');
  });

  it('stops rate-limited submissions after captcha and before email delivery', async () => {
    const services = deps();
    services.limitSubmission.mockResolvedValue({ success: false, retryAfterSeconds: 900 });
    const response = await handleDiagnosticRequest(request(valid), services);

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('900');
    expect(services.verifyTurnstile).toHaveBeenCalledOnce();
    expect(services.sendEmail).not.toHaveBeenCalled();
  });

  it('cancels an undeclared streaming body once it crosses 64 KiB', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(40 * 1024));
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(chunk);
        if (pulls === 10) controller.close();
      },
    });
    const oversized = new Request('https://bescheiben.com.br/api/diagnostico', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://bescheiben.com.br' },
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    const services = deps();

    expect((await handleDiagnosticRequest(oversized, services)).status).toBe(413);
    expect(pulls).toBeLessThanOrEqual(2);
    expect(services.limitSubmission).not.toHaveBeenCalled();
    expect(services.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('verifies captcha and delivers to the fixed Bescheiben inbox with idempotency', async () => {
    const services = deps();
    const response = await handleDiagnosticRequest(request(valid), services);
    expect(response.status).toBe(200);
    expect(services.verifyTurnstile).toHaveBeenCalledWith('test-token', expect.any(String));
    expect(services.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'bescheiben@gmail.com',
      replyTo: 'ana@example.com',
      idempotencyKey: expect.stringMatching(/^diagnostico-/),
    }));
  });
});

describe('Turnstile verification binding', () => {
  it('requires success, the production hostname and the diagnostic action', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'bescheiben.com.br',
      action: 'diagnostico',
    }), { status: 200 }));

    await expect(verifyTurnstileToken('secret', 'token', '203.0.113.7', 'bescheiben.com.br', 'diagnostico')).resolves.toBe(true);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, hostname: 'evil.example', action: 'diagnostico' }), { status: 200 }));
    await expect(verifyTurnstileToken('secret', 'token', '', 'bescheiben.com.br', 'diagnostico')).resolves.toBe(false);
    fetchMock.mockRestore();
  });
});
