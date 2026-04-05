import { createThreadSchema } from '../create-thread.dto';
import { RoutingMode } from '../../../../generated/prisma';

describe('createThreadSchema', () => {
  it('should validate a valid thread with title and routing mode', () => {
    const result = createThreadSchema.safeParse({
      title: 'My Chat Thread',
      routingMode: RoutingMode.AUTO,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('My Chat Thread');
      expect(result.data.routingMode).toBe(RoutingMode.AUTO);
    }
  });

  it('should validate an empty object (all fields optional)', () => {
    const result = createThreadSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should validate with only a title', () => {
    const result = createThreadSchema.safeParse({ title: 'Test' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test');
      expect(result.data.routingMode).toBeUndefined();
    }
  });

  it('should validate with only a routing mode', () => {
    const result = createThreadSchema.safeParse({
      routingMode: RoutingMode.LOCAL_ONLY,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.routingMode).toBe(RoutingMode.LOCAL_ONLY);
    }
  });

  it('should accept all valid routing modes', () => {
    const modes = [
      RoutingMode.AUTO,
      RoutingMode.MANUAL_MODEL,
      RoutingMode.LOCAL_ONLY,
      RoutingMode.PRIVACY_FIRST,
      RoutingMode.LOW_LATENCY,
      RoutingMode.HIGH_REASONING,
      RoutingMode.COST_SAVER,
    ];

    for (const mode of modes) {
      const result = createThreadSchema.safeParse({ routingMode: mode });
      expect(result.success).toBe(true);
    }
  });

  it('should reject a title exceeding 255 characters', () => {
    const result = createThreadSchema.safeParse({
      title: 'a'.repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it('should accept a title at exactly 255 characters', () => {
    const result = createThreadSchema.safeParse({
      title: 'a'.repeat(255),
    });

    expect(result.success).toBe(true);
  });

  it('should reject an invalid routing mode', () => {
    const result = createThreadSchema.safeParse({
      routingMode: 'INVALID_MODE',
    });

    expect(result.success).toBe(false);
  });

  it('should reject a non-string title', () => {
    const result = createThreadSchema.safeParse({
      title: 12345,
    });

    expect(result.success).toBe(false);
  });

  it('should strip unknown fields', () => {
    const result = createThreadSchema.safeParse({
      title: 'Test',
      unknownField: 'should be ignored',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect('unknownField' in result.data).toBe(false);
    }
  });
});
