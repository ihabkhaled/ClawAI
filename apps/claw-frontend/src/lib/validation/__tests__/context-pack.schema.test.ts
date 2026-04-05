import { describe, expect, it } from 'vitest';

import {
  createContextPackItemSchema,
  createContextPackSchema,
} from '@/lib/validation/context-pack.schema';

describe('createContextPackSchema', () => {
  const validInput = { name: 'My Pack' };

  it('accepts valid minimal input', () => {
    const result = createContextPackSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const result = createContextPackSchema.safeParse({
      ...validInput,
      description: 'A useful pack',
      scope: 'project',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createContextPackSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Context pack name is required');
    }
  });

  it('rejects name exceeding 255 characters', () => {
    const result = createContextPackSchema.safeParse({
      name: 'x'.repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Name must be at most 255 characters');
    }
  });

  it('rejects description exceeding 1000 characters', () => {
    const result = createContextPackSchema.safeParse({
      ...validInput,
      description: 'd'.repeat(1001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Description must be at most 1,000 characters');
    }
  });

  it('rejects scope exceeding 255 characters', () => {
    const result = createContextPackSchema.safeParse({
      ...validInput,
      scope: 's'.repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Scope must be at most 255 characters');
    }
  });

  it('accepts missing description and scope', () => {
    const result = createContextPackSchema.safeParse({ name: 'Pack' });
    expect(result.success).toBe(true);
  });
});

describe('createContextPackItemSchema', () => {
  const validInput = { type: 'text' };

  it('accepts valid minimal input', () => {
    const result = createContextPackItemSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts input with all optional fields', () => {
    const result = createContextPackItemSchema.safeParse({
      type: 'file',
      content: 'Some content',
      fileId: 'file-123',
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty type', () => {
    const result = createContextPackItemSchema.safeParse({ type: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Item type is required');
    }
  });

  it('rejects type exceeding 50 characters', () => {
    const result = createContextPackItemSchema.safeParse({
      type: 't'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 50000 characters', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      content: 'c'.repeat(50_001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects fileId exceeding 255 characters', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      fileId: 'f'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative sortOrder', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      sortOrder: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects sortOrder exceeding 10000', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      sortOrder: 10_001,
    });
    expect(result.success).toBe(false);
  });

  it('accepts sortOrder of zero', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts sortOrder at the upper boundary', () => {
    const result = createContextPackItemSchema.safeParse({
      ...validInput,
      sortOrder: 10_000,
    });
    expect(result.success).toBe(true);
  });
});
