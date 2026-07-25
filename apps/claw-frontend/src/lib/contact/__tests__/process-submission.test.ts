import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactResponseCode } from '@/enums/contact-response-code.enum';
import { processContactSubmission } from '@/lib/contact/process-submission';
import { resetRateLimiter } from '@/lib/contact/rate-limiter';

const validBody = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Self-hosting question',
  message: 'I would like to know more about running ClawAI locally.',
  elapsedMs: 5000,
};

function headers(): Headers {
  return new Headers({ 'x-forwarded-for': '203.0.113.7' });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetRateLimiter();
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('processContactSubmission', () => {
  it('rejects an invalid body with 400/INVALID', async () => {
    const result = await processContactSubmission({ name: '' }, headers());
    expect(result.httpStatus).toBe(400);
    expect(result.code).toBe(ContactResponseCode.INVALID);
  });

  it('silently rejects a filled honeypot with 200/REJECTED', async () => {
    const result = await processContactSubmission({ ...validBody, company: 'Acme' }, headers());
    expect(result.httpStatus).toBe(200);
    expect(result.code).toBe(ContactResponseCode.REJECTED);
  });

  it('rejects near-instant submissions (timing trap)', async () => {
    const result = await processContactSubmission({ ...validBody, elapsedMs: 10 }, headers());
    expect(result.code).toBe(ContactResponseCode.REJECTED);
  });

  it('accepts but does not deliver when the feature is disabled', async () => {
    process.env.CONTACT_EMAIL_ENABLED = 'false';
    const result = await processContactSubmission(validBody, headers());
    expect(result.httpStatus).toBe(200);
    expect(result.code).toBe(ContactResponseCode.ACCEPTED_NOT_CONFIGURED);
  });

  it('delivers via the console transport when enabled', async () => {
    process.env.CONTACT_EMAIL_ENABLED = 'true';
    process.env.CONTACT_EMAIL_PROVIDER = 'console';
    process.env.CONTACT_EMAIL_TO = 'ops@claw.local';
    const result = await processContactSubmission(validBody, headers());
    expect(result.httpStatus).toBe(200);
    expect(result.code).toBe(ContactResponseCode.DELIVERED);
  });

  it('rate-limits repeated submissions from the same client', async () => {
    process.env.CONTACT_EMAIL_ENABLED = 'false';
    process.env.CONTACT_RATE_LIMIT_MAX = '1';
    await processContactSubmission(validBody, headers());
    const blocked = await processContactSubmission(validBody, headers());
    expect(blocked.httpStatus).toBe(429);
    expect(blocked.code).toBe(ContactResponseCode.RATE_LIMITED);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
