import { createHash } from 'node:crypto';
import type { DiagnosticEmail, DiagnosticSubmission } from './types';

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] ?? character));

export function buildDiagnosticEmail(submission: DiagnosticSubmission, to = 'bescheiben@gmail.com'): DiagnosticEmail {
  const fields: Array<[string, string]> = [
    ['Nome', submission.name], ['Email', submission.email], ['Empresa', submission.company],
    ['Site ou perfil', submission.website || 'Não informado'], ['Situação', submission.situation],
    ['O que gostaria que fosse diferente', submission.desiredChange],
    ['O que já foi tentado', submission.attempted || 'Não informado'],
    ['Prazo relevante', submission.deadline || 'Não informado'],
    ['Preferência de contato', submission.contactPreference === 'whatsapp' ? 'WhatsApp' : 'Email'],
    ['Telefone', submission.phone || 'Não informado'],
  ];
  const text = fields.map(([label, value]) => `${label}:\n${value}`).join('\n\n');
  const html = `<h1>Novo contexto para diagnóstico</h1>${fields.map(([label, value]) => `<h2>${escapeHtml(label)}</h2><p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}`;
  const digest = createHash('sha256').update(`${submission.email}|${submission.startedAt}|${submission.situation}`).digest('hex').slice(0, 32);
  return {
    to,
    subject: `Novo diagnóstico — ${submission.company}`,
    html,
    text,
    replyTo: submission.email,
    idempotencyKey: `diagnostico-${digest}`,
  };
}
