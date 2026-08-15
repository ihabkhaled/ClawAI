import { RouterChainEntryRole, RouterProvider } from '../../../generated/prisma';
import { updateChainEntriesSchema } from '../dto/update-chain-entries.dto';

const validEntry = {
  provider: RouterProvider.GEMINI,
  modelAlias: 'gemini-2.5-flash',
};

describe('updateChainEntriesSchema', () => {
  it('accepts an empty entries array (clears the chain)', () => {
    expect(updateChainEntriesSchema.safeParse({ entries: [] }).success).toBe(true);
  });

  it('applies defaults for an entry with only the required fields', () => {
    const result = updateChainEntriesSchema.safeParse({ entries: [validEntry] });
    expect(result.success).toBe(true);
    if (result.success) {
      const entry = result.data.entries[0];
      expect(entry?.role).toBe(RouterChainEntryRole.PROVIDER_FALLBACK);
      expect(entry?.enabled).toBe(true);
      expect(entry?.attemptTimeoutMs).toBe(1600);
      expect(entry?.retries).toBe(0);
      expect(entry?.triggers).toEqual([]);
      expect(entry?.skipWhenProviderCircuitOpen).toBe(true);
    }
  });

  it('accepts a fully specified entry', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [
        {
          ...validEntry,
          role: RouterChainEntryRole.PRIMARY,
          deploymentId: 'deploy_1',
          enabled: false,
          attemptTimeoutMs: 2000,
          retries: 2,
          triggers: ['PROVIDER_TIMEOUT'],
          skipWhenProviderCircuitOpen: false,
          minConfidence: 0.6,
          maxCostMicroUsd: 1_000_000,
          billingModel: 'TOKEN',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing required field (provider)', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ modelAlias: 'gemini-2.5-flash' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown provider enum value', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ ...validEntry, provider: 'NOT_A_PROVIDER' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative maxCostMicroUsd', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ ...validEntry, maxCostMicroUsd: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer maxCostMicroUsd (no floating point)', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ ...validEntry, maxCostMicroUsd: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects minConfidence outside [0, 1]', () => {
    expect(
      updateChainEntriesSchema.safeParse({ entries: [{ ...validEntry, minConfidence: 1.5 }] })
        .success,
    ).toBe(false);
  });

  it('rejects more than 50 entries', () => {
    const entries = Array.from({ length: 51 }, () => validEntry);
    expect(updateChainEntriesSchema.safeParse({ entries }).success).toBe(false);
  });

  it('rejects an empty modelAlias', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ ...validEntry, modelAlias: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys on an entry (strict)', () => {
    const result = updateChainEntriesSchema.safeParse({
      entries: [{ ...validEntry, unknownField: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys at the top level (strict)', () => {
    expect(updateChainEntriesSchema.safeParse({ entries: [], extra: true }).success).toBe(false);
  });
});
