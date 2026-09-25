import { createHash } from 'node:crypto';
import type { DiagnosticEmail, DiagnosticSubmission } from './types';

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] ?? character));

export function buildDiagnosticEmail(submission: DiagnosticSubmission, to = 'bescheiben@gmail.com'): DiagnosticEmail {
  const fields: Array<[string, string]> = [
    ['Nome', submission.name], ['Email', submission.email],
    ...(submission.company ? [['Empresa', submission.company] as [string, string]] : []),
    ['O que está acontecendo', submission.situation],
  ];
  const text = fields.map(([label, value]) => `${label}:\n${value}`).join('\n\n');
  const html = `<h1>Novo contexto para diagnóstico</h1>${fields.map(([label, value]) => `<h2>${escapeHtml(label)}</h2><p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}`;
  const digest = createHash('sha256').update(`${submission.email}|${submission.startedAt}|${submission.situation}`).digest('hex').slice(0, 32);
  return {
    to,
    subject: `Novo contexto — ${(submission.company || submission.name).replace(/\s+/g, ' ').trim()}`,
    html,
    text,
    replyTo: submission.email,
    idempotencyKey: `diagnostico-${digest}`,
  };
}
