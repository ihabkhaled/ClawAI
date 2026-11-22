import {
  isUniqueViolation,
  liveBlockCostMicroUsd,
  liveBlockKey,
  liveUsageMonth,
  withinSpendingCap,
} from '../live-billing.utility';

describe('live billing utilities', () => {
  it('builds the block idempotency key', () => {
    expect(liveBlockKey('abc', 7)).toBe('live:abc:7');
  });

  it('formats the UTC month', () => {
    expect(liveUsageMonth(new Date('2026-12-31T23:59:59.000Z'))).toBe('2026-12');
  });

  it('prices seconds at the per-minute rate, rounding up, in integer micro-USD', () => {
    expect(liveBlockCostMicroUsd(20_000, 60)).toBe(20_000n);
    expect(liveBlockCostMicroUsd(20_000, 1)).toBe(334n);
    expect(liveBlockCostMicroUsd(20_000, 0)).toBe(0n);
    expect(liveBlockCostMicroUsd(0, 60)).toBe(0n);
  });

  it('checks the optional spending cap', () => {
    expect(withinSpendingCap(10n, 5n, null)).toBe(true);
    expect(withinSpendingCap(10n, 5n, 15n)).toBe(true);
    expect(withinSpendingCap(10n, 6n, 15n)).toBe(false);
  });

  it('recognizes a Prisma unique violation', () => {
    expect(isUniqueViolation({ code: 'P2002' })).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
