import { describe, expect, it } from 'vitest';

import { MemoryType } from '@/enums';
import { createMemorySchema, updateMemorySchema } from '@/lib/validation/memory.schema';

describe('createMemorySchema', () => {
  const validInput = {
    type: MemoryType.FACT,
    content: 'The user prefers dark mode',
  };

  it('accepts valid minimal input', () => {
    const result = createMemorySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with optional fields', () => {
    const result = createMemorySchema.safeParse({
      ...validInput,
      sourceThreadId: 'thread-123',
      sourceMessageId: 'msg-456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid memory type', () => {
    const result = createMemorySchema.safeParse({
      ...validInput,
      type: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid memory type');
    }
  });

  it('rejects empty content', () => {
    const result = createMemorySchema.safeParse({
      ...validInput,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts 250,000 characters and rejects one more', () => {
    expect(
      createMemorySchema.safeParse({ ...validInput, content: 'x'.repeat(250_000) }).success,
    ).toBe(true);
    const result = createMemorySchema.safeParse({
      ...validInput,
      content: 'x'.repeat(250_001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid memory type enum values', () => {
    for (const type of Object.values(MemoryType)) {
      const result = createMemorySchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects sourceThreadId exceeding 255 characters', () => {
    const result = createMemorySchema.safeParse({
      ...validInput,
      sourceThreadId: 'x'.repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMemorySchema', () => {
  it('accepts a content-only update', () => {
    const result = updateMemorySchema.safeParse({ content: 'Updated content' });
    expect(result.success).toBe(true);
  });

  it('accepts an isEnabled-only update', () => {
    const result = updateMemorySchema.safeParse({ isEnabled: false });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = updateMemorySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects content below minimum when provided', () => {
    const result = updateMemorySchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects content above maximum when provided', () => {
    const result = updateMemorySchema.safeParse({
      content: 'x'.repeat(250_001),
    });
    expect(result.success).toBe(false);
  });

  it('keeps a type change on update instead of stripping it', () => {
    const result = updateMemorySchema.safeParse({ type: MemoryType.FACT, content: 'x' });
    expect(result.success).toBe(true);
    expect(result.success && result.data.type).toBe(MemoryType.FACT);
    expect(updateMemorySchema.safeParse({ type: 'NOPE' }).success).toBe(false);
  });

  it('rejects non-boolean isEnabled', () => {
    const result = updateMemorySchema.safeParse({ isEnabled: 'yes' });
    expect(result.success).toBe(false);
  });
});
