import {
  adminUsageAnalyticsQuerySchema,
  adminUsageRangeQuerySchema,
} from '../admin-usage-analytics.dto';

describe('admin usage analytics DTO', () => {
  it('coerces hours from the query string and bounds it to a week', () => {
    expect(adminUsageRangeQuerySchema.parse({ hours: '24' })).toEqual({ hours: 24 });
    expect(adminUsageRangeQuerySchema.safeParse({ hours: '169' }).success).toBe(false);
    expect(adminUsageRangeQuerySchema.safeParse({ hours: '0' }).success).toBe(false);
  });

  it('rejects hours combined with from/to', () => {
    expect(
      adminUsageRangeQuerySchema.safeParse({ hours: '2', from: '2026-10-05T00:00:00Z' }).success,
    ).toBe(false);
  });

  it('rejects a non-ISO date', () => {
    expect(adminUsageRangeQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false);
  });

  it('defaults and bounds the list limit, and bounds the user id', () => {
    expect(adminUsageAnalyticsQuerySchema.parse({}).limit).toBe(10);
    expect(adminUsageAnalyticsQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(adminUsageAnalyticsQuerySchema.safeParse({ userId: 'x'.repeat(65) }).success).toBe(
      false,
    );
  });
});
