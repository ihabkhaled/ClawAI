import {
  observabilityExportQuerySchema,
  observabilityListQuerySchema,
  observabilityModelDetailQuerySchema,
  observabilityProviderDetailQuerySchema,
  observabilityProviderParamSchema,
  observabilityScopeQuerySchema,
  observabilityUsersQuerySchema,
} from '../admin-observability.dto';

describe('observability query schemas', () => {
  it('applies list defaults and the users list defaults to last seen', () => {
    const list = observabilityListQuerySchema.parse({});
    expect(list).toMatchObject({ page: 1, limit: 25, order: 'desc', sort: 'cost' });
    expect(observabilityUsersQuerySchema.parse({}).sort).toBe('lastSeen');
  });

  it('folds days into hours and takes plan and user filters', () => {
    expect(
      observabilityScopeQuerySchema.parse({ days: '90', plan: 'NONE', userId: 'u1' }),
    ).toMatchObject({ hours: 2160, plan: 'NONE', userId: 'u1' });
  });

  it('bounds page and limit', () => {
    expect(observabilityListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(observabilityListQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(observabilityListQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(observabilityListQuerySchema.safeParse({ page: 10_001 }).success).toBe(false);
    expect(observabilityListQuerySchema.parse({ page: '3', limit: '100' })).toMatchObject({
      page: 3,
      limit: 100,
    });
  });

  it('accepts the new sorts and rejects an unknown one', () => {
    expect(observabilityListQuerySchema.parse({ sort: 'costPerRequest' }).sort).toBe(
      'costPerRequest',
    );
    expect(observabilityListQuerySchema.safeParse({ sort: 'password' }).success).toBe(false);
  });

  it('rejects a preset mixed with from/to, a bad billing value and a 91 day preset', () => {
    expect(
      observabilityScopeQuerySchema.safeParse({ days: 3, from: '2026-10-01T00:00:00Z' }).success,
    ).toBe(false);
    expect(observabilityScopeQuerySchema.safeParse({ billing: 'FREE' }).success).toBe(false);
    expect(observabilityScopeQuerySchema.safeParse({ days: 91 }).success).toBe(false);
  });

  it('export carries search, order and sort but no paging', () => {
    const parsed = observabilityExportQuerySchema.parse({ search: 'jane', page: '4' });
    expect(parsed).toMatchObject({ search: 'jane', order: 'desc', sort: 'cost' });
    expect('page' in parsed).toBe(false);
  });

  it('provider detail ignores a provider or model filter', () => {
    const parsed = observabilityProviderDetailQuerySchema.parse({ provider: 'X', model: 'Y' });
    expect('provider' in parsed).toBe(false);
    expect('model' in parsed).toBe(false);
    expect(observabilityProviderParamSchema.safeParse({ provider: '' }).success).toBe(false);
  });

  it('model detail requires provider and model', () => {
    expect(observabilityModelDetailQuerySchema.safeParse({}).success).toBe(false);
    expect(
      observabilityModelDetailQuerySchema.parse({ provider: 'OLLAMA', model: 'llama3:8b' }),
    ).toMatchObject({ provider: 'OLLAMA', model: 'llama3:8b' });
  });
});
