import { createMessageSchema } from '../create-message.dto';
import { RoutingMode } from '../../../../generated/prisma';

describe('createMessageSchema', () => {
  it('should validate a correct message payload', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-abc-123',
      content: 'Hello, how are you?',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threadId).toBe('thread-abc-123');
      expect(result.data.content).toBe('Hello, how are you?');
      expect(result.data.routingMode).toBeUndefined();
    }
  });

  it('should validate a message with routing mode', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'Test message',
      routingMode: RoutingMode.HIGH_REASONING,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.routingMode).toBe(RoutingMode.HIGH_REASONING);
    }
  });

  it('should reject missing threadId', () => {
    const result = createMessageSchema.safeParse({
      content: 'Hello',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing content', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an empty object', () => {
    const result = createMessageSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject content exceeding 100000 characters', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'a'.repeat(100001),
    });

    expect(result.success).toBe(false);
  });

  it('should accept content at exactly 100000 characters', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'a'.repeat(100000),
    });

    expect(result.success).toBe(true);
  });

  it('should reject threadId exceeding 255 characters', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'a'.repeat(256),
      content: 'Hello',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an invalid routing mode', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 'Hello',
      routingMode: 'INVALID',
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-string content', () => {
    const result = createMessageSchema.safeParse({
      threadId: 'thread-1',
      content: 12345,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-string threadId', () => {
    const result = createMessageSchema.safeParse({
      threadId: 123,
      content: 'Hello',
    });

    expect(result.success).toBe(false);
  });
});
