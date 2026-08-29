import { PaygSurface } from '@claw/shared-types';

import { CreditLedgerKind } from '../../../../generated/prisma';
import { type CreditWalletRepository } from '../../repositories/credit-wallet.repository';
import { CreditWalletService } from '../credit-wallet.service';

// An in-memory stand-in for the wallet table that applies Prisma's relative
// `increment`/`decrement` operations for real. A jest.fn() returning a fixed
// object would prove nothing here: the property under test is that the balances
// and the ledger stay in step across a SEQUENCE of movements, which only shows
// up if the movements actually accumulate.
const makeFakeRepository = (seed: Partial<Record<string, bigint>> = {}) => {
  const wallet: Record<string, unknown> = {
    id: 'wallet-1',
    userId: 'user-1',
    grantMicroUsd: seed['grantMicroUsd'] ?? 0n,
    purchasedMicroUsd: seed['purchasedMicroUsd'] ?? 0n,
    reservedMicroUsd: seed['reservedMicroUsd'] ?? 0n,
    periodGrantMicroUsd: seed['periodGrantMicroUsd'] ?? 0n,
    periodKey: '2026-08',
    grantResetsAt: new Date('2026-09-01T00:00:00.000Z'),
    lifetimeGrantedMicroUsd: seed['lifetimeGrantedMicroUsd'] ?? 0n,
    lifetimePurchasedMicroUsd: 0n,
    lifetimeConsumedMicroUsd: 0n,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const ledger: Array<Record<string, unknown>> = [];

  const applyField = (key: string, operation: unknown): void => {
    if (typeof operation === 'object' && operation !== null) {
      const op = operation as { increment?: bigint; decrement?: bigint };
      if (op.increment !== undefined) {
        wallet[key] = (wallet[key] as bigint) + op.increment;
        return;
      }
      if (op.decrement !== undefined) {
        wallet[key] = (wallet[key] as bigint) - op.decrement;
        return;
      }
    }
    wallet[key] = operation;
  };

  return {
    wallet,
    ledger,
    ensure: jest.fn().mockImplementation(() => Promise.resolve(wallet)),
    findByUserId: jest.fn().mockImplementation(() => Promise.resolve(wallet)),
    applyMovements: jest.fn().mockImplementation((_id: string, steps: any[]) => {
      for (const step of steps) {
        for (const [key, operation] of Object.entries(step.walletUpdate)) {
          applyField(key, operation);
        }
        const available =
          (wallet['grantMicroUsd'] as bigint) +
          (wallet['purchasedMicroUsd'] as bigint) -
          (wallet['reservedMicroUsd'] as bigint);
        ledger.push({ ...step.ledger, balanceAfterMicroUsd: available > 0n ? available : 0n });
      }
      return Promise.resolve(wallet);
    }),
    sumLedgerDeltas: jest.fn().mockImplementation(() =>
      Promise.resolve({
        grantMicroUsd: ledger.reduce(
          (total, row) => total + (row['grantDeltaMicroUsd'] as bigint),
          0n,
        ),
        purchasedMicroUsd: ledger.reduce(
          (total, row) => total + (row['purchasedDeltaMicroUsd'] as bigint),
          0n,
        ),
        amountMicroUsd: ledger.reduce(
          (total, row) => total + (row['amountMicroUsd'] as bigint),
          0n,
        ),
      }),
    ),
    findLedgerEntryBySourceEventId: jest.fn().mockResolvedValue(null),
    findStalePeriodWallets: jest.fn().mockResolvedValue([]),
  };
};

const expectLedgerReconciles = (fake: ReturnType<typeof makeFakeRepository>): void => {
  const grant = fake.ledger.reduce((t, r) => t + (r['grantDeltaMicroUsd'] as bigint), 0n);
  const purchased = fake.ledger.reduce((t, r) => t + (r['purchasedDeltaMicroUsd'] as bigint), 0n);
  const amount = fake.ledger.reduce((t, r) => t + (r['amountMicroUsd'] as bigint), 0n);
  const available =
    (fake.wallet['grantMicroUsd'] as bigint) +
    (fake.wallet['purchasedMicroUsd'] as bigint) -
    (fake.wallet['reservedMicroUsd'] as bigint);

  expect(grant).toBe(fake.wallet['grantMicroUsd']);
  expect(purchased).toBe(fake.wallet['purchasedMicroUsd']);
  // The third identity: an OPEN hold leaves exactly `-reserved` behind, and a
  // settled reservation/release pair cancels to nothing.
  expect(amount).toBe(available);
};

describe('CreditWalletService', () => {
  let fake: ReturnType<typeof makeFakeRepository>;
  let service: CreditWalletService;

  const seedGrant = async (amount: bigint): Promise<void> => {
    await service.applyCredit({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountMicroUsd: amount,
      kind: CreditLedgerKind.PLAN_GRANT,
      toGrant: true,
      sourceEventId: null,
      actorUserId: null,
      reason: 'test grant',
    });
  };

  const seedPurchased = async (amount: bigint): Promise<void> => {
    await service.applyCredit({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountMicroUsd: amount,
      kind: CreditLedgerKind.TOPUP,
      toGrant: false,
      sourceEventId: 'evt-1',
      actorUserId: null,
      reason: null,
    });
  };

  beforeEach(() => {
    fake = makeFakeRepository();
    service = new CreditWalletService(fake as unknown as CreditWalletRepository);
  });

  it('keeps the wallet equal to the sum of its ledger through reserve then settle', async () => {
    await seedGrant(10_000n);
    await seedPurchased(5_000n);

    await service.applyHold({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-1',
      requestId: 'req-1',
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      workflow: null,
      split: { grantMicroUsd: 8_000n, purchasedMicroUsd: 0n },
    });
    expect(fake.wallet['reservedMicroUsd']).toBe(8_000n);
    // A hold moves `reserved` and NOT the buckets, so the bucket identities
    // still hold while money is in flight.
    expectLedgerReconciles(fake);

    const settlement = await service.applySettlement({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-1',
      held: { grantMicroUsd: 8_000n, purchasedMicroUsd: 0n },
      actualMicroUsd: 3_000n,
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      workflow: null,
    });

    expect(settlement.chargedMicroUsd).toBe(3_000n);
    expect(settlement.refundedMicroUsd).toBe(5_000n);
    expect(fake.wallet['reservedMicroUsd']).toBe(0n);
    expect(fake.wallet['grantMicroUsd']).toBe(7_000n);
    expect(fake.wallet['purchasedMicroUsd']).toBe(5_000n);
    expect(fake.wallet['lifetimeConsumedMicroUsd']).toBe(3_000n);
    expectLedgerReconciles(fake);
  });

  it('charges GRANT before PURCHASED when settling a hold that spans both', async () => {
    await seedGrant(2_000n);
    await seedPurchased(8_000n);
    await service.applyHold({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-2',
      requestId: 'req-2',
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      workflow: null,
      split: { grantMicroUsd: 2_000n, purchasedMicroUsd: 3_000n },
    });

    await service.applySettlement({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-2',
      held: { grantMicroUsd: 2_000n, purchasedMicroUsd: 3_000n },
      actualMicroUsd: 4_000n,
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: null,
      workflow: null,
    });

    expect(fake.wallet['grantMicroUsd']).toBe(0n);
    expect(fake.wallet['purchasedMicroUsd']).toBe(6_000n);
    expectLedgerReconciles(fake);
  });

  it('never charges more than the hold, even if the provider over-ran', async () => {
    await seedGrant(10_000n);
    await service.applyHold({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-3',
      requestId: 'req-3',
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      workflow: null,
      split: { grantMicroUsd: 1_000n, purchasedMicroUsd: 0n },
    });

    const settlement = await service.applySettlement({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-3',
      held: { grantMicroUsd: 1_000n, purchasedMicroUsd: 0n },
      actualMicroUsd: 9_999n,
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: null,
      workflow: null,
    });

    expect(settlement.chargedMicroUsd).toBe(1_000n);
    expect(fake.wallet['grantMicroUsd']).toBe(9_000n);
  });

  it('returns a released hold to the buckets it came from', async () => {
    await seedGrant(10_000n);
    await service.applyHold({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-4',
      requestId: 'req-4',
      provider: 'OPENAI',
      model: 'gpt-5',
      surface: PaygSurface.CHAT,
      workflow: null,
      split: { grantMicroUsd: 4_000n, purchasedMicroUsd: 0n },
    });

    await service.applyRelease({
      userId: 'user-1',
      walletId: 'wallet-1',
      reservationId: 'res-4',
      held: { grantMicroUsd: 4_000n, purchasedMicroUsd: 0n },
      kind: CreditLedgerKind.RESERVATION_RELEASE,
      reason: 'PROVIDER_ERROR',
    });

    expect(fake.wallet['reservedMicroUsd']).toBe(0n);
    expect(fake.wallet['grantMicroUsd']).toBe(10_000n);
    // The release must NOT have laundered perishable grant into permanent credit.
    expect(fake.wallet['purchasedMicroUsd']).toBe(0n);
    expectLedgerReconciles(fake);
  });

  it('returns an operator debit to PURCHASED first', async () => {
    await seedGrant(5_000n);
    await seedPurchased(5_000n);

    await service.applyDebit({
      userId: 'user-1',
      walletId: 'wallet-1',
      amountMicroUsd: 6_000n,
      kind: CreditLedgerKind.ADMIN_ADJUSTMENT,
      grantOnly: false,
      sourceEventId: null,
      actorUserId: 'admin-1',
      reason: 'support correction',
    });

    expect(fake.wallet['purchasedMicroUsd']).toBe(0n);
    expect(fake.wallet['grantMicroUsd']).toBe(4_000n);
    expectLedgerReconciles(fake);
  });

  it('sweeps unused grant and credits the new period as one movement pair', async () => {
    await seedGrant(3_000n);

    await service.applyPeriodRoll({
      userId: 'user-1',
      walletId: 'wallet-1',
      expiringMicroUsd: 3_000n,
      newGrantMicroUsd: 12_500_000n,
      periodKey: '2026-09',
      grantResetsAt: new Date('2026-10-01T00:00:00.000Z'),
    });

    expect(fake.wallet['grantMicroUsd']).toBe(12_500_000n);
    expect(fake.wallet['periodKey']).toBe('2026-09');
    expect(fake.wallet['periodGrantMicroUsd']).toBe(12_500_000n);
    // The sweep is its OWN row, not a silent overwrite, so the ledger still
    // sums to the wallet across a period boundary.
    expect(fake.ledger.some((row) => row['kind'] === CreditLedgerKind.GRANT_EXPIRY)).toBe(true);
    expectLedgerReconciles(fake);
  });

  describe('applyTopupReversal — ADR-083 edge case E5', () => {
    it('reverses the full amount when the credit is still unspent', async () => {
      await seedPurchased(15_000_000n);

      const outcome = await service.applyTopupReversal({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 15_000_000n,
        sourceEventId: 'evt-reversal',
        reason: 'Charged-back top-up pkg-25',
      });

      expect(outcome.reversedMicroUsd).toBe(15_000_000n);
      expect(outcome.shortfallMicroUsd).toBe(0n);
      expect(fake.wallet['purchasedMicroUsd']).toBe(0n);
      expectLedgerReconciles(fake);
    });

    it('clamps to the unspent balance and NEVER drives the wallet negative', async () => {
      await seedPurchased(15_000_000n);
      // Four dollars of the fifteen are already spent.
      await service.applyDebit({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 11_000_000n,
        kind: CreditLedgerKind.CONSUMPTION,
        grantOnly: false,
        sourceEventId: null,
        actorUserId: null,
        reason: 'spent',
      });

      const outcome = await service.applyTopupReversal({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 15_000_000n,
        sourceEventId: 'evt-reversal',
        reason: 'Charged-back top-up pkg-25',
      });

      expect(outcome.reversedMicroUsd).toBe(4_000_000n);
      expect(outcome.shortfallMicroUsd).toBe(11_000_000n);
      // The whole point: spent credit is consumed irreversibly, and a negative
      // wallet would be the platform lending money to settle a dispute.
      expect(fake.wallet['purchasedMicroUsd']).toBe(0n);
      expect(fake.wallet['purchasedMicroUsd'] as bigint).toBeGreaterThanOrEqual(0n);
      expectLedgerReconciles(fake);
    });

    it('records the unreclaimable shortfall on the ledger row', async () => {
      await seedPurchased(1_000_000n);

      await service.applyTopupReversal({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 15_000_000n,
        sourceEventId: 'evt-reversal',
        reason: 'Refunded top-up pkg-25',
      });

      const row = fake.ledger.find((entry) => entry['kind'] === CreditLedgerKind.TOPUP_REVERSAL);
      // "We clawed back less than was refunded" has to stay answerable months
      // later without re-deriving it from another service's ledger.
      expect(String(row?.['reason'])).toContain('14000000');
      expect(row?.['sourceEventId']).toBe('evt-reversal');
    });

    it('takes ONLY from PURCHASED, never from the plan allowance', async () => {
      await seedGrant(20_000_000n);
      await seedPurchased(1_000_000n);

      const outcome = await service.applyTopupReversal({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 15_000_000n,
        sourceEventId: 'evt-reversal',
        reason: 'Charged-back top-up pkg-25',
      });

      expect(outcome.reversedMicroUsd).toBe(1_000_000n);
      // The plan allowance was never part of this purchase. Taking it would
      // punish a customer for a chargeback with credit they are separately owed.
      expect(fake.wallet['grantMicroUsd']).toBe(20_000_000n);
      expectLedgerReconciles(fake);
    });

    it('still writes a ledger row when nothing could be reclaimed', async () => {
      const outcome = await service.applyTopupReversal({
        userId: 'user-1',
        walletId: 'wallet-1',
        amountMicroUsd: 15_000_000n,
        sourceEventId: 'evt-reversal',
        reason: 'Charged-back top-up pkg-25',
      });

      expect(outcome.reversedMicroUsd).toBe(0n);
      expect(outcome.shortfallMicroUsd).toBe(15_000_000n);
      // An absent row is indistinguishable from an event that never arrived.
      expect(fake.ledger.some((row) => row['kind'] === CreditLedgerKind.TOPUP_REVERSAL)).toBe(true);
      expectLedgerReconciles(fake);
    });
  });
});
