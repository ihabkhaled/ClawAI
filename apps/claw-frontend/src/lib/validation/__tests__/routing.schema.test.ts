import { describe, expect, it } from 'vitest';

import { RoutingMode } from '@/enums';
import {
  createRoutingPolicySchema,
  updateRoutingPolicySchema,
} from '@/lib/validation/routing.schema';

describe('createRoutingPolicySchema', () => {
  const validInput = {
    name: 'Default Policy',
    routingMode: RoutingMode.AUTO,
    priority: 100,
  };

  it('accepts valid minimal input', () => {
    const result = createRoutingPolicySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with optional fields', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      isActive: true,
      config: { key: 'value' },
    });
    expect(result.success).toBe(true);
  });

  // ---------- name ----------

  it('rejects empty name', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 255 characters', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      name: 'n'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  // ---------- routingMode ----------

  it('rejects invalid routing mode', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      routingMode: 'INVALID_MODE',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid routing mode');
    }
  });

  it('accepts all valid routing mode enum values', () => {
    for (const mode of Object.values(RoutingMode)) {
      const result = createRoutingPolicySchema.safeParse({
        ...validInput,
        routingMode: mode,
      });
      expect(result.success).toBe(true);
    }
  });

  // ---------- priority ----------

  it('rejects negative priority', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      priority: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects priority exceeding 1000', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      priority: 1001,
    });
    expect(result.success).toBe(false);
  });

  it('accepts priority at minimum (0)', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      priority: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts priority at maximum (1000)', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      priority: 1000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-number priority', () => {
    const result = createRoutingPolicySchema.safeParse({
      ...validInput,
      priority: '100',
    });
    expect(result.success).toBe(false);
  });

  // ---------- missing fields ----------

  it('rejects missing name', () => {
    const { name: _, ...rest } = validInput;
    const result = createRoutingPolicySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing routingMode', () => {
    const { routingMode: _, ...rest } = validInput;
    const result = createRoutingPolicySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing priority', () => {
    const { priority: _, ...rest } = validInput;
    const result = createRoutingPolicySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('updateRoutingPolicySchema', () => {
  it('accepts a partial update with only name', () => {
    const result = updateRoutingPolicySchema.safeParse({
      name: 'Updated name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = updateRoutingPolicySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('still validates individual field constraints', () => {
    const result = updateRoutingPolicySchema.safeParse({ priority: -5 });
    expect(result.success).toBe(false);
  });
});
