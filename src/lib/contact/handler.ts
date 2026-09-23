import { buildDiagnosticEmail } from './email';
import type { ContactDependencies } from './types';
import { validateDiagnosticSubmission } from './validation';

const MAX_BODY_BYTES = 64 * 1024;
const json = (status: number, body: Record<string, unknown>, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

const readBodyWithinLimit = async (request: Request): Promise<{ ok: true; raw: string } | { ok: false }> => {
  if (!request.body) return { ok: true, raw: '' };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false };
    }
    raw += decoder.decode(value, { stream: true });
  }

  raw += decoder.decode();
  return { ok: true, raw };
};

export async function handleDiagnosticRequest(request: Request, dependencies: ContactDependencies): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' }, { allow: 'POST' });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json(415, { ok: false, message: 'Formato inválido.' });
  const origin = request.headers.get('origin');
  if (!origin || origin !== dependencies.expectedOrigin) return json(403, { ok: false, message: 'Não foi possível enviar.' });
  const lengthHeader = request.headers.get('content-length');
  if (lengthHeader !== null) {
    const declaredLength = Number(lengthHeader);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) return json(400, { ok: false, message: 'Dados inválidos.' });
    if (declaredLength > MAX_BODY_BYTES) return json(413, { ok: false, message: 'Mensagem muito grande.' });
  }

  let body: Awaited<ReturnType<typeof readBodyWithinLimit>>;
  try { body = await readBodyWithinLimit(request); } catch { return json(400, { ok: false, message: 'Dados inválidos.' }); }
  if (!body.ok) return json(413, { ok: false, message: 'Mensagem muito grande.' });

  let input: unknown;
  try { input = JSON.parse(body.raw); } catch { return json(400, { ok: false, message: 'Dados inválidos.' }); }
  const validation = validateDiagnosticSubmission(input, dependencies.now());
  if (!validation.ok) return json(422, { ok: false, message: 'Revise os campos destacados.', errors: validation.errors });

  const remoteIp = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for'))?.split(',')[0]?.trim() ?? '';
  try {
    if (!await dependencies.verifyTurnstile(validation.data.turnstileToken, remoteIp)) return json(400, { ok: false, message: 'Não foi possível validar o envio. Tente novamente.' });
  } catch {
    return json(503, { ok: false, message: 'A validação está temporariamente indisponível.' });
  }

  try {
    const decision = await dependencies.limitSubmission({ remoteIp, email: validation.data.email });
    if (!decision.success) return json(429, { ok: false, message: 'Muitas tentativas. Tente novamente mais tarde.' }, {
      'retry-after': String(decision.retryAfterSeconds),
    });
  } catch {
    return json(503, { ok: false, message: 'O envio está temporariamente indisponível.' });
  }

  try {
    await dependencies.sendEmail(buildDiagnosticEmail(validation.data, dependencies.toEmail));
    return json(200, { ok: true, message: 'Contexto recebido.' });
  } catch {
    return json(503, { ok: false, message: 'Não foi possível enviar agora. Tente novamente em alguns minutos.' });
  }
}
