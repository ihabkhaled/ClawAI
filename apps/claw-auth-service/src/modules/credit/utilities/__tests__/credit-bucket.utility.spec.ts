import {
  availableMicroUsd,
  splitDebitAcrossBuckets,
  splitRefundAcrossBuckets,
  toSafeBalanceNumber,
} from '../credit-bucket.utility';

describe('credit bucket split', () => {
  describe('debits take GRANT first', () => {
    it('spends the perishable half before money the user paid for', () => {
      const split = splitDebitAcrossBuckets(1000n, 400n, 5000n);
      expect(split).toEqual({ grantMicroUsd: 400n, purchasedMicroUsd: 600n });
    });

    it('leaves PURCHASED untouched while GRANT can cover the whole debit', () => {
      const split = splitDebitAcrossBuckets(300n, 400n, 5000n);
      expect(split).toEqual({ grantMicroUsd: 300n, purchasedMicroUsd: 0n });
    });

    it('never borrows: a debit larger than the wallet returns only what is there', () => {
      const split = splitDebitAcrossBuckets(10_000n, 400n, 600n);
      expect(split.grantMicroUsd + split.purchasedMicroUsd).toBe(1000n);
    });

    it('treats a negative bucket as empty rather than as credit', () => {
      const split = splitDebitAcrossBuckets(500n, -100n, 500n);
      expect(split).toEqual({ grantMicroUsd: 0n, purchasedMicroUsd: 500n });
    });
  });

  describe('refunds return to PURCHASED first', () => {
    it('gives cash back before allowance that expires at the period roll', () => {
      const split = splitRefundAcrossBuckets(1000n, 600n, 900n);
      expect(split).toEqual({ purchasedMicroUsd: 600n, grantMicroUsd: 400n });
    });

    it('reproduces the original split exactly for a FULL release', () => {
      const held = splitDebitAcrossBuckets(1000n, 400n, 5000n);
      const returned = splitRefundAcrossBuckets(
        held.grantMicroUsd + held.purchasedMicroUsd,
        held.purchasedMicroUsd,
        held.grantMicroUsd,
      );
      // A release must never launder perishable GRANT into permanent PURCHASED.
      expect(returned).toEqual(held);
    });

    it('caps at what each bucket lent', () => {
      const split = splitRefundAcrossBuckets(5000n, 100n, 200n);
      expect(split).toEqual({ purchasedMicroUsd: 100n, grantMicroUsd: 200n });
    });
  });

  describe('availableMicroUsd', () => {
    it('is net of outstanding holds', () => {
      expect(availableMicroUsd(1000n, 500n, 200n)).toBe(1300n);
    });

    it('floors at zero rather than reporting a negative balance', () => {
      expect(availableMicroUsd(100n, 0n, 500n)).toBe(0n);
    });
  });

  describe('toSafeBalanceNumber', () => {
    it('clamps an absurd balance instead of throwing on the money path', () => {
      expect(toSafeBalanceNumber(BigInt(Number.MAX_SAFE_INTEGER) * 2n)).toBe(
        Number.MAX_SAFE_INTEGER,
      );
    });

    it('reports a negative balance as zero', () => {
      expect(toSafeBalanceNumber(-5n)).toBe(0);
    });
  });
});
