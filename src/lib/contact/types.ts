export type ContactPreference = 'email' | 'whatsapp';

export interface DiagnosticSubmission {
  name: string;
  email: string;
  company: string;
  website: string;
  situation: string;
  desiredChange: string;
  attempted: string;
  deadline: string;
  contactPreference: ContactPreference;
  phone: string;
  turnstileToken: string;
  startedAt: number;
}

export interface DiagnosticEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
  idempotencyKey: string;
}

export interface ContactDependencies {
  now: () => number;
  expectedOrigin: string;
  toEmail: string;
  limitSubmission: (input: { remoteIp: string; email: string }) => Promise<{ success: boolean; retryAfterSeconds: number }>;
  verifyTurnstile: (token: string, remoteIp: string) => Promise<boolean>;
  sendEmail: (email: DiagnosticEmail) => Promise<{ id?: string }>;
}
