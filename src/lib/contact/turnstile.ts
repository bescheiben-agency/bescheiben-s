const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  secret: string,
  token: string,
  remoteIp: string,
  expectedHostname: string,
  expectedAction: string,
): Promise<boolean> {
  if (!secret || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  const response = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  return result.success === true && result.hostname === expectedHostname && result.action === expectedAction;
}
