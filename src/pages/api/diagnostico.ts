import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { handleDiagnosticRequest } from '../../lib/contact/handler';
import { createContactRateLimiter } from '../../lib/contact/rate-limit';
import { verifyTurnstileToken } from '../../lib/contact/turnstile';

export const prerender = false;

const upstashUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
const upstashToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;
const rateLimitHashSecret = import.meta.env.RATE_LIMIT_HASH_SECRET;
const contactRateLimiter = upstashUrl && upstashToken && rateLimitHashSecret
  ? createContactRateLimiter(upstashUrl, upstashToken, rateLimitHashSecret)
  : null;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.CONTACT_FROM_EMAIL;
  const to = 'bescheiben@gmail.com';
  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY;
  const expectedOrigin = (import.meta.env.PUBLIC_SITE_URL || 'https://bescheiben.com.br').replace(/\/$/, '');
  let expectedHostname = '';
  try { expectedHostname = new URL(expectedOrigin).hostname; } catch { /* handled by configuration guard */ }

  if (!apiKey || !from || !turnstileSecret || !contactRateLimiter || !expectedHostname) {
    return new Response(JSON.stringify({ ok: false, message: 'O formulário ainda não está configurado.' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const resend = new Resend(apiKey);
  return handleDiagnosticRequest(request, {
    now: () => Date.now(),
    expectedOrigin,
    toEmail: to,
    limitSubmission: contactRateLimiter,
    verifyTurnstile: (token, remoteIp) => verifyTurnstileToken(turnstileSecret, token, remoteIp, expectedHostname, 'diagnostico'),
    sendEmail: async (email) => {
      const result = await resend.emails.send({
        from,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }, { idempotencyKey: email.idempotencyKey });
      if (result.error) throw new Error('Email provider rejected the request.');
      return { id: result.data?.id };
    },
  });
};

export const ALL: APIRoute = () => new Response(JSON.stringify({ ok: false, message: 'Método não permitido.' }), {
  status: 405,
  headers: { 'content-type': 'application/json; charset=utf-8', allow: 'POST' },
});
