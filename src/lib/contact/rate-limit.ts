import { createHmac } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitInput {
  remoteIp: string;
  email: string;
}

export interface RateLimitDecision {
  success: boolean;
  retryAfterSeconds: number;
}

export function createContactRateLimiter(url: string, token: string, hashSecret: string) {
  const redis = new Redis({ url, token });
  const common = { redis, analytics: false, timeout: 0 } as const;
  const identifier = (scope: string, value: string) => createHmac('sha256', hashSecret)
    .update(`${scope}:${value || 'unknown'}`)
    .digest('hex');
  const perIp = new Ratelimit({
    ...common,
    prefix: 'bescheiben:diagnostico:ip',
    limiter: Ratelimit.slidingWindow(5, '1 h'),
  });
  const perEmail = new Ratelimit({
    ...common,
    prefix: 'bescheiben:diagnostico:email',
    limiter: Ratelimit.slidingWindow(3, '24 h'),
  });
  const global = new Ratelimit({
    ...common,
    prefix: 'bescheiben:diagnostico:global',
    limiter: Ratelimit.slidingWindow(100, '24 h'),
  });

  return async ({ remoteIp, email }: RateLimitInput): Promise<RateLimitDecision> => {
    const results = await Promise.all([
      perIp.limit(identifier('ip', remoteIp)),
      perEmail.limit(identifier('email', email.toLowerCase())),
      global.limit('mailbox'),
    ]);
    const blocked = results.filter((result) => !result.success);
    const reset = blocked.length > 0 ? Math.max(...blocked.map((result) => result.reset)) : 0;

    return {
      success: blocked.length === 0,
      retryAfterSeconds: blocked.length > 0 ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 0,
    };
  };
}
