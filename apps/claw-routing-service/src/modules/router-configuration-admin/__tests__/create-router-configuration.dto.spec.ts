import { createRouterConfigurationSchema } from '../dto/create-router-configuration.dto';

describe('createRouterConfigurationSchema', () => {
  it('defaults scope to GLOBAL', () => {
    const result = createRouterConfigurationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe('GLOBAL');
    }
  });

  it('accepts an explicit scope', () => {
    expect(createRouterConfigurationSchema.safeParse({ scope: 'TENANT_A' }).success).toBe(true);
  });

  it('rejects an empty scope', () => {
    expect(createRouterConfigurationSchema.safeParse({ scope: '' }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(createRouterConfigurationSchema.safeParse({ mode: 'CLOUD_FIRST' }).success).toBe(false);
  });
});
