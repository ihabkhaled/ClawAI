import { ForbiddenException } from '@nestjs/common';
import { Permission } from '@claw/shared-types';
import { describe, expect, it, vi } from 'vitest';

import { ThreadJobBudgetService } from '../thread-job-budget.service';
import { ThreadJobBudgetCloseStatus } from '../../enums/thread-job-budget-close-status.enum';

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
    finalize: vi.fn(),
    release: vi.fn(),
    get: vi.fn(),
    close: vi.fn(),
  };

  function build(): ThreadJobBudgetService {
    return new ThreadJobBudgetService(
      entitlements as never,
      featureUsage as never,
      repository as never,
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

  it('consumes existing plan reservations only after every call is closed', async () => {
    reset();
    repository.get.mockResolvedValue({ status: 'ACTIVE', featureReservationIds: ['feature-a'] });
    repository.close.mockResolvedValue({ count: 1 });

    await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.FINALIZED)).resolves.toBe(
      true,
    );
    expect(featureUsage.settle).toHaveBeenCalledWith('feature-a', 'CONSUME');
  });

  it('keeps plan reservations when a provider call is still unresolved', async () => {
    reset();
    repository.get.mockResolvedValue({ status: 'ACTIVE', featureReservationIds: ['feature-a'] });
    repository.close.mockResolvedValue(null);

    await expect(build().close('budget-1', ThreadJobBudgetCloseStatus.RELEASED)).resolves.toBe(
      false,
    );
    expect(featureUsage.settle).not.toHaveBeenCalled();
  });
});
