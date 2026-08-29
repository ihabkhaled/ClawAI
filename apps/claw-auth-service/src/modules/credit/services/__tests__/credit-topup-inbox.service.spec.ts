import { EventPattern } from '@claw/shared-types';

import { CreditLedgerKind } from '../../../../generated/prisma';
import { CreditTopupInboxService } from '../credit-topup-inbox.service';
import type { CreditWalletService } from '../credit-wallet.service';
import type { EntitlementInboxRepository } from '../../../entitlements/repositories/entitlement-inbox.repository';

const SUCCEEDED = {
  eventId: 'evt-1',
  schemaVersion: 1,
  producer: 'claw-payment-service',
  userId: 'user-1',
  creditMicroUsd: '15000000',
  packageId: 'pkg-25',
  packageVersionId: 'cpv-9',
  paymentTransactionId: 'txn-1',
  amountMinor: 2500,
  currency: 'USD',
  occurredAt: '2026-08-29T10:00:00.000Z',
  correlationId: 'corr-1',
  causationId: 'sess-1',
};

const REVERSED = {
  ...SUCCEEDED,
  eventId: 'evt-2',
  sourcePaymentTransactionId: 'txn-1',
  paymentTransactionId: 'txn-2',
  isChargeback: true,
};

describe('CreditTopupInboxService', () => {
  let inbox: { claim: jest.Mock; markProcessed: jest.Mock; markFailed: jest.Mock };
  let wallets: {
    ensure: jest.Mock;
    applyCredit: jest.Mock;
    applyTopupReversal: jest.Mock;
  };
  let service: CreditTopupInboxService;

  beforeEach(() => {
    inbox = {
      claim: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    wallets = {
      ensure: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
      applyCredit: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
      applyTopupReversal: jest.fn().mockResolvedValue({
        wallet: { id: 'wallet-1' },
        reversedMicroUsd: 15_000_000n,
        shortfallMicroUsd: 0n,
      }),
    };
    service = new CreditTopupInboxService(
      inbox as unknown as EntitlementInboxRepository,
      wallets as unknown as CreditWalletService,
    );
  });

  describe('the four guards', () => {
    it('rejects a payload that fails schema validation', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, {
        ...SUCCEEDED,
        creditMicroUsd: 15_000_000,
      });

      expect(outcome).toBe('REJECTED_SCHEMA');
      expect(inbox.claim).not.toHaveBeenCalled();
      expect(wallets.applyCredit).not.toHaveBeenCalled();
    });

    it('rejects an untrusted producer — only payment-service may add money', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, {
        ...SUCCEEDED,
        producer: 'claw-chat-service',
      });

      expect(outcome).toBe('REJECTED_PRODUCER');
      expect(wallets.applyCredit).not.toHaveBeenCalled();
    });

    it('rejects an envelope version it does not understand', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, {
        ...SUCCEEDED,
        schemaVersion: 2,
      });

      expect(outcome).toBe('REJECTED_VERSION');
      expect(wallets.applyCredit).not.toHaveBeenCalled();
    });

    it('claims the event BEFORE applying it', async () => {
      await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, SUCCEEDED);

      expect(inbox.claim).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'evt-1',
          eventType: EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED,
          producer: 'claw-payment-service',
          userId: 'user-1',
        }),
      );
      const claimedAt = inbox.claim.mock.invocationCallOrder[0];
      const creditedAt = wallets.applyCredit.mock.invocationCallOrder[0];
      expect(claimedAt).toBeDefined();
      expect(creditedAt).toBeDefined();
      expect(claimedAt ?? 0).toBeLessThan(creditedAt ?? 0);
    });
  });

  describe('granting credit', () => {
    it('credits PURCHASED with the exact BigInt figure and the source event id', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, SUCCEEDED);

      expect(outcome).toBe('APPLIED');
      expect(wallets.applyCredit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          walletId: 'wallet-1',
          amountMicroUsd: 15_000_000n,
          kind: CreditLedgerKind.TOPUP,
          // PURCHASED, not GRANT: bought credit must not expire at the roll.
          toGrant: false,
          // UNIQUE in the database — the idempotency backstop behind the claim.
          sourceEventId: 'evt-1',
        }),
      );
      expect(inbox.markProcessed).toHaveBeenCalledWith('evt-1');
    });

    it('grants credit exactly ONCE for a redelivered event', async () => {
      inbox.claim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const first = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, SUCCEEDED);
      const second = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, SUCCEEDED);

      expect(first).toBe('APPLIED');
      expect(second).toBe('DUPLICATE');
      expect(wallets.applyCredit).toHaveBeenCalledTimes(1);
    });

    it('records the event as FAILED rather than losing it when the wallet write throws', async () => {
      wallets.applyCredit.mockRejectedValue(new Error('deadlock detected'));

      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_SUCCEEDED, SUCCEEDED);

      expect(outcome).toBe('FAILED');
      expect(inbox.markFailed).toHaveBeenCalledWith('evt-1', 'deadlock detected');
      expect(inbox.markProcessed).not.toHaveBeenCalled();
    });
  });

  describe('reversing credit', () => {
    it('reverses against the wallet with the source event id for idempotency', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);

      expect(outcome).toBe('APPLIED');
      expect(wallets.applyTopupReversal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          walletId: 'wallet-1',
          amountMicroUsd: 15_000_000n,
          sourceEventId: 'evt-2',
        }),
      );
    });

    it('reports CREDIT_REVERSAL_EXCEEDS_UNSPENT when the credit was already spent', async () => {
      wallets.applyTopupReversal.mockResolvedValue({
        wallet: { id: 'wallet-1' },
        reversedMicroUsd: 4_000_000n,
        shortfallMicroUsd: 11_000_000n,
      });

      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);

      // APPLIED-with-a-clamp, not FAILED: the reversal has landed for everything
      // the wallet still held, and marking it failed would have the
      // reconciliation sweep retry a reversal that can never take any more.
      expect(outcome).toBe('REVERSAL_CLAMPED');
      expect(inbox.markProcessed).toHaveBeenCalledWith('evt-2');
      expect(inbox.markFailed).not.toHaveBeenCalled();
    });

    it('reverses exactly ONCE for a redelivered chargeback', async () => {
      inbox.claim.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);
      const second = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);

      expect(second).toBe('DUPLICATE');
      expect(wallets.applyTopupReversal).toHaveBeenCalledTimes(1);
    });

    it('rejects a reversal from an untrusted producer', async () => {
      const outcome = await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, {
        ...REVERSED,
        producer: 'someone-else',
      });

      expect(outcome).toBe('REJECTED_PRODUCER');
      expect(wallets.applyTopupReversal).not.toHaveBeenCalled();
    });

    it('claims the reversal under its own pattern, in the shared inbox', async () => {
      await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);

      // One inbox table, one unique eventId, so a single reconciliation sweep
      // covers every at-least-once billing event.
      expect(inbox.claim).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'evt-2',
          eventType: EventPattern.BILLING_CREDIT_TOPUP_REVERSED,
        }),
      );
    });

    it('never grants credit while handling a reversal', async () => {
      await service.handle(EventPattern.BILLING_CREDIT_TOPUP_REVERSED, REVERSED);

      expect(wallets.applyCredit).not.toHaveBeenCalled();
    });
  });
});
