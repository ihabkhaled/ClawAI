import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { contactSchema } from '@/lib/validation/contact.schema';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Question about self-hosting',
  message: 'I would like to know more about running ClawAI locally.',
};

describe('contactSchema', () => {
  it('uses CSP-safe validation without runtime code generation', () => {
    expect(z.config().jitless).toBe(true);
  });

  it('accepts a well-formed submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(contactSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('rejects a too-short message', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'short' }).success).toBe(false);
  });

  it('caps overly long fields', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'x'.repeat(5001) }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, subject: 'x'.repeat(161) }).success).toBe(false);
  });

  it('accepts a filled honeypot at the schema level (rejected downstream)', () => {
    // The schema stays permissive so a bot cannot distinguish the honeypot
    // trap from a normal request; processContactSubmission does the rejecting.
    expect(contactSchema.safeParse({ ...valid, company: 'Acme' }).success).toBe(true);
  });

  it('accepts an empty or omitted honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, company: '' }).success).toBe(true);
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('caps an abusively long honeypot value', () => {
    expect(contactSchema.safeParse({ ...valid, company: 'x'.repeat(201) }).success).toBe(false);
  });

  it('accepts an optional elapsedMs and rejects a negative one', () => {
    expect(contactSchema.safeParse({ ...valid, elapsedMs: 3000 }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, elapsedMs: -1 }).success).toBe(false);
  });
});
