import { beforeEach, describe, expect, it } from 'vitest';

import { ThreadCallReserveOutcome } from '../../../credit/enums/thread-call-reserve-outcome.enum';
import { SerializationRetryExhaustedError } from '../../utilities/serializable-retry.utility';
import { ThreadJobBudgetRepository } from '../thread-job-budget.repository';
import { FakeThreadBudgetDatabase } from './helpers/fake-thread-budget-prisma.helper';

describe('ThreadJobBudgetRepository', () => {
  let database: FakeThreadBudgetDatabase;
  let repository: ThreadJobBudgetRepository;

  beforeEach(() => {
    database = new FakeThreadBudgetDatabase();
    repository = new ThreadJobBudgetRepository(database.client() as never);
    repository.retryTuning = { sleep: () => Promise.resolve(), random: () => 0.5 };
  });

  const call = (budgetId: string, requestId: string, hold: string | null, amount = 100n) => ({
    budgetId,
    requestId,
    creditReservationId: hold,
    amountMicroUsd: amount,
  });

  describe('parallel author calls (D1)', () => {
    it('reserves every one of five simultaneous calls despite serialization conflicts', async () => {
      const budget = database.seedBudget({ capMicroUsd: 10_000n });

      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((n) =>
          repository.reserveCall(call(budget.id, `job:author-${String(n)}`, `hold-${String(n)}`)),
        ),
      );

      expect(results.map((result) => result.outcome)).toEqual(
        Array(5).fill(ThreadCallReserveOutcome.RESERVED),
      );
      expect(database.conflicts).toBeGreaterThan(0);
      expect(database.callsOf(budget.id)).toHaveLength(5);
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(500n);
    });

    it('never lets parallel calls overshoot the cap', async () => {
      const budget = database.seedBudget({ capMicroUsd: 250n });

      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((n) =>
          repository.reserveCall(call(budget.id, `job:author-${String(n)}`, `hold-${String(n)}`)),
        ),
      );

      const reserved = results.filter((r) => r.outcome === ThreadCallReserveOutcome.RESERVED);
      const refused = results.filter((r) => r.outcome === ThreadCallReserveOutcome.CAP_EXCEEDED);
      expect(reserved).toHaveLength(2);
      expect(refused).toHaveLength(3);
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(200n);
      for (const result of refused) {
        expect(result.remainingMicroUsd).toBe(50n);
      }
    });

    it('settles parallel calls without losing a single spend', async () => {
      const budget = database.seedBudget({ capMicroUsd: 10_000n });
      await Promise.all(
        [1, 2, 3, 4].map((n) =>
          repository.reserveCall(call(budget.id, `job:a${String(n)}`, `hold-${String(n)}`, 500n)),
        ),
      );

      await Promise.all(
        [1, 2, 3, 4].map((n) => repository.settleCall(budget.id, `job:a${String(n)}`, 120n)),
      );

      const row = database.budgets.get(budget.id);
      expect(row?.spentMicroUsd).toBe(480n);
      expect(row?.reservedMicroUsd).toBe(0n);
    });

    it('reports a transient conflict as exhaustion of the retries, not as a refusal', async () => {
      const budget = database.seedBudget();
      database.forcedConflicts = 1_000;

      await expect(
        repository.reserveCall(call(budget.id, 'job:a', 'hold-1')),
      ).rejects.toBeInstanceOf(SerializationRetryExhaustedError);
      expect(database.callsOf(budget.id)).toHaveLength(0);
    });

    it('rethrows an error that is not a conflict at once', async () => {
      const budget = database.seedBudget();
      database.failWith = new Error('connection lost');

      await expect(repository.reserveCall(call(budget.id, 'job:a', 'hold-1'))).rejects.toThrow(
        'connection lost',
      );
      expect(database.conflicts).toBe(0);
    });
  });

  describe('idempotent reservation (D2)', () => {
    it('answers a repeated reserve of a RESERVED call from the existing row', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));

      const again = await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));

      expect(again.outcome).toBe(ThreadCallReserveOutcome.ALREADY_RESERVED);
      expect(database.callsOf(budget.id)).toHaveLength(1);
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(100n);
    });

    it('lets a duplicate create race resolve to one row', async () => {
      const budget = database.seedBudget();

      const results = await Promise.all([
        repository.reserveCall(call(budget.id, 'job:a', 'hold-1')),
        repository.reserveCall(call(budget.id, 'job:a', 'hold-1')),
        repository.reserveCall(call(budget.id, 'job:a', 'hold-1')),
      ]);

      const outcomes = results.map((result) => result.outcome).sort();
      expect(outcomes).toEqual([
        ThreadCallReserveOutcome.ALREADY_RESERVED,
        ThreadCallReserveOutcome.ALREADY_RESERVED,
        ThreadCallReserveOutcome.RESERVED,
      ]);
      expect(database.callsOf(budget.id)).toHaveLength(1);
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(100n);
    });

    it('lets a retried request id run again after its first attempt was FINALIZED', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.settleCall(budget.id, 'job:a', 40n);

      const retry = await repository.reserveCall(call(budget.id, 'job:a', 'hold-2', 150n));

      expect(retry.outcome).toBe(ThreadCallReserveOutcome.RESERVED);
      const row = database.callsOf(budget.id)[0];
      expect(row?.status).toBe('RESERVED');
      expect(row?.creditReservationId).toBe('hold-2');
      expect(database.budgets.get(budget.id)).toMatchObject({
        reservedMicroUsd: 150n,
        spentMicroUsd: 40n,
      });
      await repository.settleCall(budget.id, 'job:a', 60n);
      expect(database.callsOf(budget.id)[0]?.settledMicroUsd).toBe(100n);
      expect(database.budgets.get(budget.id)?.spentMicroUsd).toBe(100n);
    });

    it('lets a retried request id run again after its first attempt was RELEASED', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.releaseCall(budget.id, 'job:a');

      const retry = await repository.reserveCall(call(budget.id, 'job:a', 'hold-2'));

      expect(retry.outcome).toBe(ThreadCallReserveOutcome.RESERVED);
      expect(database.budgets.get(budget.id)).toMatchObject({
        reservedMicroUsd: 100n,
        spentMicroUsd: 0n,
      });
    });

    it('answers a duplicate of a call that already FINALIZED with a defined outcome', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.settleCall(budget.id, 'job:a', 40n);

      const duplicate = await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));

      expect(duplicate.outcome).toBe(ThreadCallReserveOutcome.ALREADY_FINALIZED);
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(0n);
    });

    it('answers a duplicate of a RELEASED call with a defined outcome', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.releaseCall(budget.id, 'job:a');

      const duplicate = await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));

      expect(duplicate.outcome).toBe(ThreadCallReserveOutcome.ALREADY_RELEASED);
    });

    it('follows a retry that carries a new hold and gives the old one back to the caller', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));

      const retry = await repository.reserveCall(call(budget.id, 'job:a', 'hold-2', 160n));

      expect(retry).toMatchObject({
        outcome: ThreadCallReserveOutcome.RESERVED,
        supersededCreditReservationId: 'hold-1',
      });
      expect(database.budgets.get(budget.id)?.reservedMicroUsd).toBe(160n);
      expect(database.callsOf(budget.id)).toHaveLength(1);
    });

    it('does not reopen a call on a closed budget', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.releaseCall(budget.id, 'job:a');
      await repository.close(budget.id, 'RELEASED');

      const retry = await repository.reserveCall(call(budget.id, 'job:a', 'hold-2'));

      expect(retry.outcome).toBe(ThreadCallReserveOutcome.BUDGET_CLOSED);
    });

    it('refuses a reopening that no longer fits the cap, with the honest outcome', async () => {
      const budget = database.seedBudget({ capMicroUsd: 120n });
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      await repository.settleCall(budget.id, 'job:a', 100n);

      const retry = await repository.reserveCall(call(budget.id, 'job:a', 'hold-2', 100n));

      expect(retry).toMatchObject({
        outcome: ThreadCallReserveOutcome.CAP_EXCEEDED,
        remainingMicroUsd: 20n,
      });
    });
  });

  describe('outcomes that are not exhaustion', () => {
    it('says BUDGET_NOT_FOUND for an unknown budget', async () => {
      const result = await repository.reserveCall(call('nope', 'job:a', 'hold-1'));
      expect(result.outcome).toBe(ThreadCallReserveOutcome.BUDGET_NOT_FOUND);
    });

    it('says BUDGET_CLOSED, not CAP_EXCEEDED, for a finished job', async () => {
      const budget = database.seedBudget({ status: 'RELEASED' });
      const result = await repository.reserveCall(call(budget.id, 'job:a', 'hold-1'));
      expect(result.outcome).toBe(ThreadCallReserveOutcome.BUDGET_CLOSED);
    });

    it('says CAP_EXCEEDED with what is left when a call does not fit', async () => {
      const budget = database.seedBudget({ capMicroUsd: 1_000n, spentMicroUsd: 950n });
      const result = await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));
      expect(result).toMatchObject({
        outcome: ThreadCallReserveOutcome.CAP_EXCEEDED,
        remainingMicroUsd: 50n,
      });
    });
  });

  describe('settling', () => {
    it('is idempotent: a second settle of a FINALIZED call succeeds and changes nothing', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 500n));
      await repository.settleCall(budget.id, 'job:a', 120n);

      await expect(repository.settleCall(budget.id, 'job:a', 500n)).resolves.toBe(true);

      expect(database.budgets.get(budget.id)?.spentMicroUsd).toBe(120n);
    });

    it('refuses a settle above the hold', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));
      await expect(repository.settleCall(budget.id, 'job:a', 101n)).resolves.toBe(false);
    });

    it('settles by credit hold at the CHARGE, capped at the hold, and only once', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 500n));

      await expect(repository.settleByCreditReservation('hold-1', 90n)).resolves.toBe(true);
      await expect(repository.settleByCreditReservation('hold-1', 90n)).resolves.toBe(false);

      expect(database.budgets.get(budget.id)).toMatchObject({
        spentMicroUsd: 90n,
        reservedMicroUsd: 0n,
      });
    });

    it('never counts more than the hold even if the charge reported is higher', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 500n));
      await repository.settleByCreditReservation('hold-1', 9_999n);
      expect(database.budgets.get(budget.id)?.spentMicroUsd).toBe(500n);
    });

    it('the caller finalize after the credit settle is a no-op that succeeds', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 500n));
      await repository.settleByCreditReservation('hold-1', 90n);

      await expect(repository.settleCall(budget.id, 'job:a', 500n)).resolves.toBe(true);

      expect(database.budgets.get(budget.id)?.spentMicroUsd).toBe(90n);
    });

    it('does nothing for a hold that belongs to no budget call', async () => {
      await expect(repository.settleByCreditReservation('unknown', 1n)).resolves.toBe(false);
    });
  });

  describe('close with calls in flight (D5)', () => {
    it('releases the in-flight calls and closes in one step', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));
      await repository.reserveCall(call(budget.id, 'job:b', 'hold-2', 200n));
      await repository.reserveCall(call(budget.id, 'job:c', 'hold-3', 50n));
      await repository.settleCall(budget.id, 'job:c', 30n);

      const result = await repository.close(budget.id, 'RELEASED');

      expect(result.closed).toBe(true);
      expect(result.releasedCreditReservationIds.sort()).toEqual(['hold-1', 'hold-2']);
      expect(database.budgets.get(budget.id)).toMatchObject({
        status: 'RELEASED',
        reservedMicroUsd: 0n,
        spentMicroUsd: 30n,
      });
      expect(
        database
          .callsOf(budget.id)
          .map((c) => c.status)
          .sort(),
      ).toEqual(['FINALIZED', 'RELEASED', 'RELEASED']);
    });

    it('closes a budget with nothing in flight', async () => {
      const budget = database.seedBudget();
      const result = await repository.close(budget.id, 'FINALIZED');
      expect(result).toEqual({ closed: true, releasedCreditReservationIds: [] });
    });

    it('reports an already-closed budget as not closed, without touching it', async () => {
      const budget = database.seedBudget({ status: 'FINALIZED' });
      const result = await repository.close(budget.id, 'RELEASED');
      expect(result).toEqual({ closed: false, releasedCreditReservationIds: [] });
      expect(database.budgets.get(budget.id)?.status).toBe('FINALIZED');
    });

    it('wins the race against a call being reserved at the same moment', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));

      const [closed, late] = await Promise.all([
        repository.close(budget.id, 'RELEASED'),
        repository.reserveCall(call(budget.id, 'job:late', 'hold-late', 100n)),
      ]);

      expect(closed.closed).toBe(true);
      const row = database.budgets.get(budget.id);
      expect(row?.reservedMicroUsd).toBe(0n);
      const open = database.callsOf(budget.id).filter((c) => c.status === 'RESERVED');
      expect(open).toHaveLength(0);
      // The late call either lost to the close or was released by it; it never leaks a reservation.
      expect([ThreadCallReserveOutcome.BUDGET_CLOSED, ThreadCallReserveOutcome.RESERVED]).toContain(
        late.outcome,
      );
    });

    it('lets a late settle of a released call fail harmlessly', async () => {
      const budget = database.seedBudget();
      await repository.reserveCall(call(budget.id, 'job:a', 'hold-1', 100n));
      await repository.close(budget.id, 'RELEASED');

      await expect(repository.settleCall(budget.id, 'job:a', 10n)).resolves.toBe(false);
      await expect(repository.settleByCreditReservation('hold-1', 10n)).resolves.toBe(false);
      expect(database.budgets.get(budget.id)?.spentMicroUsd).toBe(0n);
    });
  });
});
