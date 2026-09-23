import type { DiagnosticSubmission } from './types';

type FieldErrors = Partial<Record<keyof DiagnosticSubmission | 'form', string>>;
export type ValidationResult = { ok: true; data: DiagnosticSubmission } | { ok: false; errors: FieldErrors };

const ALLOWED_FIELDS = new Set([
  'name', 'email', 'company', 'website', 'situation', 'desiredChange', 'attempted', 'deadline',
  'contactPreference', 'phone', 'turnstileToken', 'websiteTrap', 'startedAt',
]);

const string = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\r\n/g, '\n') : '';
const within = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]{8,32}$/;

export function validateDiagnosticSubmission(input: unknown, now = Date.now()): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: { form: 'Dados inválidos.' } };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_FIELDS.has(key))) return { ok: false, errors: { form: 'Dados inválidos.' } };

  const name = string(record.name);
  const email = string(record.email).toLowerCase();
  const company = string(record.company);
  const website = string(record.website);
  const situation = string(record.situation);
  const desiredChange = string(record.desiredChange);
  const attempted = string(record.attempted);
  const deadline = string(record.deadline);
  const contactPreference = string(record.contactPreference);
  const phone = string(record.phone);
  const turnstileToken = string(record.turnstileToken);
  const websiteTrap = string(record.websiteTrap);
  const startedAt = Number(string(record.startedAt));
  const errors: FieldErrors = {};

  if (!within(name, 2, 120)) errors.name = 'Informe seu nome.';
  if (!within(email, 5, 254) || !emailPattern.test(email)) errors.email = 'Informe um email válido.';
  if (!within(company, 2, 160)) errors.company = 'Informe a empresa.';
  if (website.length > 300) errors.website = 'Use no máximo 300 caracteres.';
  if (!within(situation, 20, 4000)) errors.situation = 'Conte a situação com um pouco mais de contexto.';
  if (!within(desiredChange, 20, 4000)) errors.desiredChange = 'Conte o que você gostaria que fosse diferente.';
  if (attempted.length > 3000) errors.attempted = 'Use no máximo 3000 caracteres.';
  if (deadline.length > 500) errors.deadline = 'Use no máximo 500 caracteres.';
  if (contactPreference !== 'email' && contactPreference !== 'whatsapp') errors.contactPreference = 'Escolha email ou WhatsApp.';
  if (contactPreference === 'whatsapp' && !phonePattern.test(phone)) errors.phone = 'Informe um telefone com DDD.';
  if (!within(turnstileToken, 1, 2048)) errors.turnstileToken = 'Confirme que você não é um robô.';
  if (websiteTrap) errors.form = 'Não foi possível enviar.';
  if (!Number.isFinite(startedAt) || now - startedAt < 3_000 || now - startedAt > 86_400_000) errors.form = 'Atualize a página e tente novamente.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name, email, company, website, situation, desiredChange, attempted, deadline,
      contactPreference: contactPreference as DiagnosticSubmission['contactPreference'],
      phone, turnstileToken, startedAt,
    },
  };
}
