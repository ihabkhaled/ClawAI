import { describe, expect, it } from 'vitest';

import { sendMessageSchema } from '@/lib/validation/message.schema';

describe('sendMessageSchema', () => {
  it('accepts valid message content', () => {
    const result = sendMessageSchema.safeParse({ content: 'Hello, AI!' });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = sendMessageSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Message content is required');
    }
  });

  it('rejects content exceeding 100,000 characters', () => {
    const result = sendMessageSchema.safeParse({
      content: 'x'.repeat(100001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Message content must be at most 100,000 characters',
      );
    }
  });

  it('accepts content at exact maximum length', () => {
    const result = sendMessageSchema.safeParse({
      content: 'x'.repeat(100000),
    });
    expect(result.success).toBe(true);
  });

  it('accepts a single character', () => {
    const result = sendMessageSchema.safeParse({ content: 'a' });
    expect(result.success).toBe(true);
  });

  it('rejects missing content field', () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string content', () => {
    const result = sendMessageSchema.safeParse({ content: 123 });
    expect(result.success).toBe(false);
  });
});
