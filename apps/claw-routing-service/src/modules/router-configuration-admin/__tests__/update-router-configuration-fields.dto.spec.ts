import { updateRouterConfigurationFieldsSchema } from '../dto/update-router-configuration-fields.dto';

describe('updateRouterConfigurationFieldsSchema', () => {
  it('accepts a single field', () => {
    const result = updateRouterConfigurationFieldsSchema.safeParse({ totalDeadlineMs: 15_000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ totalDeadlineMs: 15_000 });
    }
  });

  it('accepts several fields at once', () => {
    const result = updateRouterConfigurationFieldsSchema.safeParse({
      totalDeadlineMs: 15_000,
      maxAttempts: 8,
      minConfidence: 0.6,
      failClosedWhenNoEligibleRouter: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty body — no field to change is not a valid PATCH', () => {
    expect(updateRouterConfigurationFieldsSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(updateRouterConfigurationFieldsSchema.safeParse({ notAField: 1 }).success).toBe(false);
  });

  it('rejects a totalDeadlineMs below the minimum', () => {
    expect(updateRouterConfigurationFieldsSchema.safeParse({ totalDeadlineMs: 50 }).success).toBe(
      false,
    );
  });

  it('rejects a minConfidence outside [0, 1]', () => {
    expect(updateRouterConfigurationFieldsSchema.safeParse({ minConfidence: 1.5 }).success).toBe(
      false,
    );
  });

  it('rejects an invalid lowConfidenceAction enum value', () => {
    expect(
      updateRouterConfigurationFieldsSchema.safeParse({ lowConfidenceAction: 'NOT_REAL' }).success,
    ).toBe(false);
  });
});
