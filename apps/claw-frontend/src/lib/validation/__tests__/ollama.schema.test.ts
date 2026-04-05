import { describe, expect, it } from 'vitest';

import { assignRoleSchema, pullModelSchema } from '@/lib/validation/ollama.schema';

describe('pullModelSchema', () => {
  const validInput = { modelName: 'llama2', runtime: 'ollama' as const };

  it('accepts valid input', () => {
    const result = pullModelSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty modelName', () => {
    const result = pullModelSchema.safeParse({
      ...validInput,
      modelName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Model name is required');
    }
  });

  it('rejects modelName exceeding 255 characters', () => {
    const result = pullModelSchema.safeParse({
      ...validInput,
      modelName: 'm'.repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Model name must be at most 255 characters');
    }
  });

  it('rejects invalid runtime', () => {
    const result = pullModelSchema.safeParse({
      ...validInput,
      runtime: 'invalid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid runtime');
    }
  });

  it('accepts all valid runtime values', () => {
    const runtimes = ['ollama', 'llamacpp', 'vllm', 'lmstudio'] as const;
    for (const runtime of runtimes) {
      const result = pullModelSchema.safeParse({
        modelName: 'test-model',
        runtime,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing runtime', () => {
    const result = pullModelSchema.safeParse({ modelName: 'llama2' });
    expect(result.success).toBe(false);
  });

  it('rejects missing modelName', () => {
    const result = pullModelSchema.safeParse({ runtime: 'ollama' });
    expect(result.success).toBe(false);
  });
});

describe('assignRoleSchema', () => {
  const validInput = { modelId: 'model-1', role: 'ROUTER' as const };

  it('accepts valid input', () => {
    const result = assignRoleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects empty modelId', () => {
    const result = assignRoleSchema.safeParse({
      ...validInput,
      modelId: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Model ID is required');
    }
  });

  it('rejects modelId exceeding 255 characters', () => {
    const result = assignRoleSchema.safeParse({
      ...validInput,
      modelId: 'i'.repeat(256),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Model ID must be at most 255 characters');
    }
  });

  it('rejects invalid role', () => {
    const result = assignRoleSchema.safeParse({
      ...validInput,
      role: 'INVALID',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid role');
    }
  });

  it('accepts all valid role values', () => {
    const roles = ['ROUTER', 'FALLBACK', 'REASONING', 'CODING'] as const;
    for (const role of roles) {
      const result = assignRoleSchema.safeParse({
        modelId: 'model-1',
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing role', () => {
    const result = assignRoleSchema.safeParse({ modelId: 'model-1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing modelId', () => {
    const result = assignRoleSchema.safeParse({ role: 'ROUTER' });
    expect(result.success).toBe(false);
  });
});
