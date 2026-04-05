import { createMemorySchema } from '../create-memory.dto';
import { MemoryType } from '../../../../generated/prisma';

describe('createMemorySchema', () => {
  it('should validate a correct memory payload with required fields', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'The user prefers dark mode',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(MemoryType.FACT);
      expect(result.data.content).toBe('The user prefers dark mode');
      expect(result.data.sourceThreadId).toBeUndefined();
      expect(result.data.sourceMessageId).toBeUndefined();
    }
  });

  it('should validate a memory payload with all fields', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.SUMMARY,
      content: 'Discussion about project architecture',
      sourceThreadId: 'thread-123',
      sourceMessageId: 'msg-456',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceThreadId).toBe('thread-123');
      expect(result.data.sourceMessageId).toBe('msg-456');
    }
  });

  it('should accept all valid memory types', () => {
    const types = [
      MemoryType.SUMMARY,
      MemoryType.FACT,
      MemoryType.PREFERENCE,
      MemoryType.INSTRUCTION,
    ];

    for (const type of types) {
      const result = createMemorySchema.safeParse({
        type,
        content: 'Test content',
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing type', () => {
    const result = createMemorySchema.safeParse({
      content: 'Some content',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid type', () => {
    const result = createMemorySchema.safeParse({
      type: 'INVALID_TYPE',
      content: 'Some content',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing content', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject content exceeding 50000 characters', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'a'.repeat(50001),
    });

    expect(result.success).toBe(false);
  });

  it('should accept content at exactly 50000 characters', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'a'.repeat(50000),
    });

    expect(result.success).toBe(true);
  });

  it('should reject sourceThreadId exceeding 255 characters', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'Test',
      sourceThreadId: 'a'.repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it('should reject sourceMessageId exceeding 255 characters', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'Test',
      sourceMessageId: 'a'.repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty object', () => {
    const result = createMemorySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject non-string content', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 12345,
    });

    expect(result.success).toBe(false);
  });

  it('should strip unknown fields', () => {
    const result = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'Test',
      unknownField: 'should be stripped',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect('unknownField' in result.data).toBe(false);
    }
  });
});
