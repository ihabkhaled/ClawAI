import { scopeQuerySchema } from '../dto/scope-query.dto';

describe('scopeQuerySchema', () => {
  it('defaults to the GLOBAL scope when omitted', () => {
    const result = scopeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe('GLOBAL');
    }
  });

  it('accepts an explicit scope', () => {
    const result = scopeQuerySchema.safeParse({ scope: 'TENANT_A' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty scope string', () => {
    expect(scopeQuerySchema.safeParse({ scope: '' }).success).toBe(false);
  });

  it('rejects a scope over 100 characters', () => {
    expect(scopeQuerySchema.safeParse({ scope: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(scopeQuerySchema.safeParse({ scope: 'GLOBAL', extra: 1 }).success).toBe(false);
  });
});
