import { createPlanSchema } from '../create-plan.dto';
import { updatePlanSchema } from '../update-plan.dto';

// ADR-142: free requests per credit connector per UTC month. null is unlimited
// and 0 is none: the schema must keep them distinct and bounded.
const create = (creditConnectorFreeRequestsPerMonth?: number | null) =>
  createPlanSchema.safeParse({
    name: 'Plan',
    slug: 'plan',
    dailyTokenQuota: 1,
    ...(creditConnectorFreeRequestsPerMonth === undefined
      ? {}
      : { creditConnectorFreeRequestsPerMonth }),
  });

const update = (creditConnectorFreeRequestsPerMonth: number | null) =>
  updatePlanSchema.safeParse({ creditConnectorFreeRequestsPerMonth });

describe('creditConnectorFreeRequestsPerMonth DTO', () => {
  describe('create', () => {
    it.each([0, 1, 2, 500, 1_000_000])('accepts %i', (value) => {
      expect(create(value).success).toBe(true);
    });

    it('accepts null (unlimited)', () => {
      expect(create(null).success).toBe(true);
    });

    it('may be omitted: the column defaults to 0, so a new plan gives nothing away', () => {
      const parsed = create();
      expect(parsed.success).toBe(true);
      expect(parsed.data?.creditConnectorFreeRequestsPerMonth).toBeUndefined();
    });

    it.each([-1, 1.5, 1_000_001])('rejects %s', (value) => {
      expect(create(value).success).toBe(false);
    });

    it('rejects a string', () => {
      expect(
        createPlanSchema.safeParse({
          name: 'Plan',
          slug: 'plan',
          dailyTokenQuota: 1,
          creditConnectorFreeRequestsPerMonth: '2',
        }).success,
      ).toBe(false);
    });
  });

  describe('update', () => {
    it.each([0, 3, 1_000_000])('accepts %i', (value) => {
      expect(update(value).success).toBe(true);
    });

    it('accepts null (unlimited)', () => {
      expect(update(null).success).toBe(true);
    });

    it.each([-1, 0.5, 1_000_001])('rejects %s', (value) => {
      expect(update(value).success).toBe(false);
    });

    it('keeps 0 and null distinct in the parsed value', () => {
      expect(update(0).data?.creditConnectorFreeRequestsPerMonth).toBe(0);
      expect(update(null).data?.creditConnectorFreeRequestsPerMonth).toBeNull();
    });
  });
});

// ADR-162: the free allowance is also a money meter and a model price limit, integer micro-USD.
describe('free allowance meter and price limit DTO', () => {
  const base = { name: 'Plan', slug: 'plan', dailyTokenQuota: 1 };

  it.each([
    ['creditConnectorFreeBudgetMicroUsd', 250_000],
    ['creditConnectorFreeMaxModelOutputMicroUsd', 5_000_000],
  ])('accepts %s as an integer, zero and null', (field, value) => {
    expect(createPlanSchema.safeParse({ ...base, [field]: value }).success).toBe(true);
    expect(createPlanSchema.safeParse({ ...base, [field]: 0 }).success).toBe(true);
    expect(createPlanSchema.safeParse({ ...base, [field]: null }).success).toBe(true);
    expect(updatePlanSchema.safeParse({ [field]: value }).success).toBe(true);
  });

  it.each(['creditConnectorFreeBudgetMicroUsd', 'creditConnectorFreeMaxModelOutputMicroUsd'])(
    'rejects a negative, fractional, string or absurd %s',
    (field) => {
      for (const bad of [-1, 1.5, '250000', 1_000_000_001]) {
        expect(createPlanSchema.safeParse({ ...base, [field]: bad }).success, String(bad)).toBe(
          false,
        );
      }
    },
  );

  it('may be omitted: a new plan has no meter and no limit', () => {
    const parsed = createPlanSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.creditConnectorFreeBudgetMicroUsd).toBeUndefined();
  });
});
