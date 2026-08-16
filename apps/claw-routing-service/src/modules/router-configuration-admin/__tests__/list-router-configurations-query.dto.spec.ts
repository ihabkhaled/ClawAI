import { RouterConfigurationStatus } from '../../../generated/prisma';
import { listRouterConfigurationsQuerySchema } from '../dto/list-router-configurations-query.dto';

describe('listRouterConfigurationsQuerySchema', () => {
  it('defaults scope, page and limit when omitted', () => {
    const result = listRouterConfigurationsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ scope: 'GLOBAL', page: 1, limit: 50 });
    }
  });

  it('coerces string query params to numbers', () => {
    const result = listRouterConfigurationsQuerySchema.safeParse({ page: '3', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });

  it('accepts every RouterConfigurationStatus value', () => {
    for (const status of Object.values(RouterConfigurationStatus)) {
      expect(listRouterConfigurationsQuerySchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects an unknown status value', () => {
    expect(listRouterConfigurationsQuerySchema.safeParse({ status: 'ARCHIVED' }).success).toBe(
      false,
    );
  });

  it('rejects limit above 200', () => {
    expect(listRouterConfigurationsQuerySchema.safeParse({ limit: 201 }).success).toBe(false);
  });

  it('rejects page below 1', () => {
    expect(listRouterConfigurationsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(listRouterConfigurationsQuerySchema.safeParse({ sort: 'asc' }).success).toBe(false);
  });
});
