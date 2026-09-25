import type { DiagnosticSubmission } from './types';

type FieldErrors = Partial<Record<keyof DiagnosticSubmission | 'form', string>>;
export type ValidationResult = { ok: true; data: DiagnosticSubmission } | { ok: false; errors: FieldErrors };

const ALLOWED_FIELDS = new Set([
  'name', 'email', 'company', 'situation', 'turnstileToken', 'websiteTrap', 'startedAt',
]);

const string = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\r\n/g, '\n') : '';
const within = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDiagnosticSubmission(input: unknown, now = Date.now()): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: { form: 'Dados inválidos.' } };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_FIELDS.has(key))) return { ok: false, errors: { form: 'Dados inválidos.' } };

  const name = string(record.name);
  const email = string(record.email).toLowerCase();
  const company = string(record.company);
  const situation = string(record.situation);
  const turnstileToken = string(record.turnstileToken);
  const websiteTrap = string(record.websiteTrap);
  const startedAt = Number(string(record.startedAt));
  const errors: FieldErrors = {};

  if (!within(name, 2, 120)) errors.name = 'Informe seu nome.';
  if (!within(email, 5, 254) || !emailPattern.test(email)) errors.email = 'Informe um email válido.';
  if (company && !within(company, 2, 160)) errors.company = 'Informe ao menos duas letras ou deixe em branco.';
  if (!within(situation, 10, 1200)) errors.situation = 'Conte brevemente o que está acontecendo (10 a 1200 caracteres).';
  if (!within(turnstileToken, 1, 2048)) errors.turnstileToken = 'Confirme que você não é um robô.';
  if (websiteTrap) errors.form = 'Não foi possível enviar.';
  if (!Number.isFinite(startedAt) || now - startedAt < 3_000 || now - startedAt > 86_400_000) errors.form = 'Atualize a página e tente novamente.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name, email, company, situation, turnstileToken, startedAt,
    },
  };
}
