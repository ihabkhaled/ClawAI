import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { describe, expect, it, vi } from 'vitest';

import { SerializationRetryExhaustedError } from '../../../entitlements/utilities/serializable-retry.utility';
import { ThreadCallReserveOutcome } from '../../enums/thread-call-reserve-outcome.enum';
import { ThreadJobBudgetCloseStatus } from '../../enums/thread-job-budget-close-status.enum';
import { ThreadJobBudgetService } from '../thread-job-budget.service';

describe('ThreadJobBudgetService', () => {
  const entitlements = {
    getEnforcedForUser: vi.fn(),
  };
  const featureUsage = {
    reserve: vi.fn(),
    settle: vi.fn(),
  };
  const repository = {
    findByRequest: vi.fn(),
    create: vi.fn(),
    reserveCall: vi.fn(),
    settleCall: vi.fn(),
    releaseCall: vi.fn(),
    get: vi.fn(),
    close: vi.fn(),
  };
  const credit = { release: vi.fn() };

  function build(): ThreadJobBudgetService {
    return new ThreadJobBudgetService(
      entitlements as never,
      featureUsage as never,
      repository as never,
      credit as never,
    );
  }

  function reset(): void {
    vi.resetAllMocks();
    entitlements.getEnforcedForUser.mockResolvedValue({
      isAdmin: false,
      permissions: [Permission.THREAD_GENERATION_USE],
      plan: { id: 'plan-1' },
    });
    featureUsage.reserve.mockResolvedValue({ allowed: true, reservationId: 'feature-reservation' });
    featureUsage.settle.mockResolvedValue(undefined);
    credit.release.mockResolvedValue(undefined);
    repository.findByRequest.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: 'budget-1',
      userId: 'user-1',
      requestId: 'request-1',
      capMicroUsd: 1_000_000n,
      status: 'ACTIVE',
      featureReservationIds: ['feature-reservation'],
    });
  }

  it('reserves the existing research, judge, and critic plan allowances once per job', async () => {
    reset();

    const result = await build().reserve({
      userId: 'user-1',
      requestId: 'request-1',
      capMicroUsd: 1_000_000n,
    });

    expect(result.id).toBe('budget-1');
    expect(featureUsage.reserve).toHaveBeenCalledTimes(3);
    expect(featureUsage.reserve.mock.calls.map(([input]) => input.feature)).toEqual([
      'RESEARCH_MODE',
      'JUDGE_MODE',
      'CRITIC_REVIEW',
    ]);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ capMicroUsd: 1_000_000n }),
    );
    expect(featureUsage.settle).not.toHaveBeenCalled();
  });

  it('refuses users without the Threads generation permission before reserving usage', async () => {
    reset();
    entitlements.getEnforcedForUser.mockResolvedValue({
      isAdmin: false,
      permissions: [],
      plan: {},
    });

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 0n }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(featureUsage.reserve).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('releases earlier plan holds when a later plan feature is unavailable', async () => {
    reset();
    featureUsage.reserve
      .mockResolvedValueOnce({ allowed: true, reservationId: 'research' })
      .mockResolvedValueOnce({ allowed: false, reason: 'FEATURE_TRIAL_EXHAUSTED' });

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 0n }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(featureUsage.settle).toHaveBeenCalledWith('research', 'RELEASE');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('releases every plan hold when the budget row cannot be written (D4)', async () => {
    reset();
    featureUsage.reserve
      .mockResolvedValueOnce({ allowed: true, reservationId: 'research' })
      .mockResolvedValueOnce({ allowed: true, reservationId: 'judge' })
      .mockResolvedValueOnce({ allowed: true, reservationId: 'critic' });
    repository.create.mockRejectedValue(new Error('db down'));

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 5n }),
    ).rejects.toThrow('db down');
    expect(featureUsage.settle.mock.calls.map(([id]) => id).sort()).toEqual([
      'critic',
      'judge',
      'research',
    ]);
  });

  it('still releases the others when one release fails, and surfaces the original error', async () => {
    reset();
    featureUsage.reserve
      .mockResolvedValueOnce({ allowed: true, reservationId: 'research' })
      .mockResolvedValueOnce({ allowed: true, reservationId: 'judge' })
      .mockResolvedValueOnce({ allowed: true, reservationId: 'critic' });
    repository.create.mockRejectedValue(new Error('db down'));
    featureUsage.settle.mockRejectedValueOnce(new Error('release failed'));

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 5n }),
    ).rejects.toThrow('db down');
    expect(featureUsage.settle).toHaveBeenCalledTimes(3);
  });

  it('releases the plan holds when the permission lookup itself throws', async () => {
    reset();
    featureUsage.reserve.mockRejectedValueOnce(new Error('policy store down'));

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 5n }),
    ).rejects.toThrow('policy store down');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('adopts the winner of a parallel create with the same key and keeps the shared holds', async () => {
    reset();
    const winner = {
      id: 'budget-w',
      userId: 'user-1',
      requestId: 'request-1',
      capMicroUsd: 5n,
      status: 'ACTIVE',
      featureReservationIds: ['feature-reservation'],
    };
    repository.findByRequest.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
    repository.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 5n }),
    ).resolves.toEqual(winner);
    expect(featureUsage.settle).not.toHaveBeenCalled();
  });

  it('returns the same budget on an idempotent retry with the same cap', async () => {
    reset();
    const existing = {
      id: 'budget-1',
      userId: 'user-1',
      requestId: 'request-1',
      capMicroUsd: 5n,
      status: 'ACTIVE',
    };
    repository.findByRequest.mockResolvedValue(existing);

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 5n }),
    ).resolves.toEqual(existing);
    expect(featureUsage.reserve).not.toHaveBeenCalled();
  });

  it('rejects an idempotency retry that tries to change the selected cap', async () => {
    reset();
    repository.findByRequest.mockResolvedValue({
      id: 'budget-1',
      userId: 'user-1',
      requestId: 'request-1',
      capMicroUsd: 5n,
      status: 'ACTIVE',
    });

    await expect(
      build().reserve({ userId: 'user-1', requestId: 'request-1', capMicroUsd: 6n }),
    ).rejects.toThrow('idempotency key already has a different spend cap');
  });

  describe('reserveCall', () => {
    const input = {
      budgetId: 'budget-1',
      requestId: 'job:a',
      creditReservationId: 'hold-2',
      amountMicroUsd: 100n,
    };

    it('returns the repository outcome', async () => {
      reset();
      const result = {
        outcome: ThreadCallReserveOutcome.RESERVED,
        remainingMicroUsd: 900n,
        supersededCreditReservationId: null,
      };
      repository.reserveCall.mockResolvedValue(result);

      await expect(build().reserveCall(input)).resolves.toEqual(result);
      expect(credit.release).not.toHaveBeenCalled();
    });

    it('gives back the credit hold a retry replaced', async () => {
      reset();
      repository.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.RESERVED,
        remainingMicroUsd: 900n,
        supersededCreditReservationId: 'hold-1',
      });

      await build().reserveCall(input);

      expect(credit.release).toHaveBeenCalledWith('hold-1', 'CANCELLED');
    });

    it('does not fail the reservation when the superseded hold cannot be released', async () => {
      reset();
      repository.reserveCall.mockResolvedValue({
        outcome: ThreadCallReserveOutcome.RESERVED,
        remainingMicroUsd: 900n,
        supersededCreditReservationId: 'hold-1',
      });
      credit.release.mockRejectedValue(new Error('redis down'));

      await expect(build().reserveCall(input)).resolves.toMatchObject({
        outcome: ThreadCallReserveOutcome.RESERVED,
      });
    });

    it('turns exhausted retries into a 503 with a retryable code, not a refusal', async () => {
      reset();
      repository.reserveCall.mockRejectedValue(
        new SerializationRetryExhaustedError(8, new Error('P2034')),
      );

      const failure = await build()
        .reserveCall(input)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ServiceUnavailableException);
      expect((failure as ServiceUnavailableException).getResponse()).toMatchObject({
        code: 'THREAD_BUDGET_BUSY',
      });
    });

    it('passes any other failure through untouched', async () => {
      reset();
      repository.reserveCall.mockRejectedValue(new Error('connection lost'));
      await expect(build().reserveCall(input)).rejects.toThrow('connection lost');
    });
  });

  describe('summary', () => {
    it('reports the charge counted so far and what is left, in integer micro-USD', async () => {
      reset();
      repository.get.mockResolvedValue({
        status: 'ACTIVE',
        capMicroUsd: 300_000n,
        reservedMicroUsd: 21_226n,
        spentMicroUsd: 12_000n,
      });

      await expect(build().summary('budget-1')).resolves.toEqual({
        status: 'ACTIVE',
        capMicroUsd: 300_000,
        reservedMicroUsd: 21_226,
        spentMicroUsd: 12_000,
        settledMicroUsd: 12_000,
        remainingMicroUsd: 266_774,
      });
    });

    it('answers 404 for a budget that does not exist', async () => {
      reset();
      repository.get.mockResolvedValue(null);
      await expect(build().summary('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('close', () => {
    it('consumes the plan reservations when the job finished', async () => {
      reset();
      repository.get.mockResolvedValue({ status: 'ACTIVE', featureReservationIds: ['feature-a'] });
      repository.close.mockResolvedValue({ closed: true, releasedCreditReservationIds: [] });

      await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.FINALIZED)).resolves.toBe(
        true,
      );
      expect(featureUsage.settle).toHaveBeenCalledWith('feature-a', 'CONSUME');
    });

    it('releases in-flight calls, gives back their credit holds and returns the allowance (D5)', async () => {
      reset();
      repository.get.mockResolvedValue({ status: 'ACTIVE', featureReservationIds: ['feature-a'] });
      repository.close.mockResolvedValue({
        closed: true,
        releasedCreditReservationIds: ['hold-1', 'hold-2'],
      });

      await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(
        true,
      );
      expect(credit.release.mock.calls).toEqual([
        ['hold-1', 'CANCELLED'],
        ['hold-2', 'CANCELLED'],
      ]);
      expect(featureUsage.settle).toHaveBeenCalledWith('feature-a', 'RELEASE');
    });

    it('closes even when a credit hold cannot be given back (the sweeper reclaims it)', async () => {
      reset();
      repository.get.mockResolvedValue({ status: 'ACTIVE', featureReservationIds: ['feature-a'] });
      repository.close.mockResolvedValue({
        closed: true,
        releasedCreditReservationIds: ['hold-1'],
      });
      credit.release.mockRejectedValue(new Error('redis down'));

      await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(
        true,
      );
      expect(featureUsage.settle).toHaveBeenCalledWith('feature-a', 'RELEASE');
    });

    it('asks the caller to retry when the allowance cannot be settled, and finishes on the retry', async () => {
      reset();
      repository.get.mockResolvedValueOnce({
        status: 'ACTIVE',
        featureReservationIds: ['feature-a', 'feature-b'],
      });
      repository.close.mockResolvedValue({ closed: true, releasedCreditReservationIds: [] });
      featureUsage.settle.mockRejectedValueOnce(new Error('policy store down'));

      await expect(
        build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(featureUsage.settle).toHaveBeenCalledTimes(2);

      featureUsage.settle.mockClear();
      repository.get.mockResolvedValue({
        status: 'RELEASED',
        featureReservationIds: ['feature-a', 'feature-b'],
      });
      await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(
        true,
      );
      expect(featureUsage.settle).toHaveBeenCalledTimes(2);
      expect(repository.close).toHaveBeenCalledTimes(1);
    });

    it('answers false for a budget closed the OTHER way and does not touch the allowance', async () => {
      reset();
      repository.get.mockResolvedValue({
        status: 'FINALIZED',
        featureReservationIds: ['feature-a'],
      });

      await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(
        false,
      );
      expect(featureUsage.settle).not.toHaveBeenCalled();
    });

    it('answers false for an unknown budget', async () => {
      reset();
      repository.get.mockResolvedValue(null);
      await expect(build().close('nope', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(false);
    });

    it('settles the allowance once when two closes race and one loses', async () => {
      reset();
      repository.get
        .mockResolvedValueOnce({ status: 'ACTIVE', featureReservationIds: ['feature-a'] })
        .mockResolvedValueOnce({ status: 'ACTIVE', featureReservationIds: ['feature-a'] })
        .mockResolvedValue({ status: 'RELEASED', featureReservationIds: ['feature-a'] });
      repository.close
        .mockResolvedValueOnce({ closed: true, releasedCreditReservationIds: ['hold-1'] })
        .mockResolvedValueOnce({ closed: false, releasedCreditReservationIds: [] });
      const service = build();

      const [first, second] = await Promise.all([
        service.close('budget-1', ThreadJobBudgetCloseStatus.RELEASED),
        service.close('budget-1', ThreadJobBudgetCloseStatus.RELEASED),
      ]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(credit.release).toHaveBeenCalledTimes(1);
    });
  });
});
