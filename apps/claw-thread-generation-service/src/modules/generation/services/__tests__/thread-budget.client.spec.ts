import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { GenerationBudgetCloseStatus } from '../../../../common/enums/generation-budget-close-status.enum';
import { ThreadBudgetClient } from '../thread-budget.client';
import { ThreadBudgetCloseRefusedError } from '../../utilities/thread-budget-close-refused.error';

describe('ThreadBudgetClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reserves the owner-selected cap with the idempotency request ID', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    } as never);
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'budget-1',
          userId: 'owner-1',
          requestId: 'request-1',
          capMicroUsd: 2_000_000,
          status: 'ACTIVE',
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(
      new ThreadBudgetClient().reserve('owner-1', 'request-1', 2_000_000),
    ).resolves.toEqual({
      id: 'budget-1',
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://auth-service:4001/api/v1/internal/threads/budgets/reserve',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Service ${'x'.repeat(32)}` }),
        body: JSON.stringify({ userId: 'owner-1', requestId: 'request-1', capMicroUsd: 2_000_000 }),
      }),
    );
  });

  it('preserves an entitlement denial from Auth', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    } as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    await expect(
      new ThreadBudgetClient().reserve('owner-1', 'request-1', 2_000_000),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps the used/limit/window body of an allowance refusal', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    } as never);
    const body = {
      statusCode: 403,
      code: 'THREAD_ALLOWANCE_UNAVAILABLE',
      message: 'Your plan allows 1 Thread generation with Judge review, and 1 is used.',
      feature: 'JUDGE_MODE',
      reason: 'LIMIT_REACHED',
      used: 1,
      limit: 1,
      window: 'LIFETIME',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 403 })),
    );

    const error = await new ThreadBudgetClient()
      .reserve('owner-1', 'request-1', 2_000_000)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      code: 'THREAD_ALLOWANCE_UNAVAILABLE',
      feature: 'JUDGE_MODE',
      used: 1,
      limit: 1,
      window: 'LIFETIME',
    });
  });

  it('keeps the plain refusal for a feature the plan switches off', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      AUTH_SERVICE_URL: 'https://auth-service:4001',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    } as never);
    const body = {
      code: 'THREAD_ALLOWANCE_UNAVAILABLE',
      message: 'Your plan does not include Judge review.',
      feature: 'JUDGE_MODE',
      reason: 'FEATURE_DISABLED',
      used: 0,
      limit: 0,
      window: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 403 })),
    );

    const error = await new ThreadBudgetClient()
      .reserve('owner-1', 'request-1', 2_000_000)
      .catch((caught: unknown) => caught);

    expect((error as ForbiddenException).getResponse()).toMatchObject({
      message: 'Threads generation is not permitted',
    });
  });

  describe('close', () => {
    const configure = (): void => {
      vi.spyOn(AppConfig, 'get').mockReturnValue({
        AUTH_SERVICE_URL: 'https://auth-service:4001',
        INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
      } as never);
    };

    it('sends PLATFORM_FAILED so auth refunds the Free allowance', async () => {
      configure();
      const fetch = vi.fn().mockResolvedValue(new Response('true', { status: 200 }));
      vi.stubGlobal('fetch', fetch);

      await new ThreadBudgetClient().close('budget-1', GenerationBudgetCloseStatus.PLATFORM_FAILED);

      expect(fetch).toHaveBeenCalledWith(
        'https://auth-service:4001/api/v1/internal/threads/budgets/close',
        expect.objectContaining({
          body: JSON.stringify({ budgetId: 'budget-1', status: 'PLATFORM_FAILED' }),
        }),
      );
    });

    it('resolves when the budget service answers true', async () => {
      configure();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('true', { status: 200 })));

      await expect(
        new ThreadBudgetClient().close('budget-1', 'RELEASED' as never),
      ).resolves.toBeUndefined();
    });

    it.each([['null'], [''], ['false']])(
      'reports a refusal when the budget service answers %j (a call is still reserved)',
      async (body) => {
        configure();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));

        await expect(
          new ThreadBudgetClient().close('budget-1', 'RELEASED' as never),
        ).rejects.toBeInstanceOf(ThreadBudgetCloseRefusedError);
      },
    );

    it('reports an outage, not a refusal, for a failed request', async () => {
      configure();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

      const failure = await new ThreadBudgetClient()
        .close('budget-1', 'RELEASED' as never)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ServiceUnavailableException);
      expect(failure).not.toBeInstanceOf(ThreadBudgetCloseRefusedError);
    });
  });

  describe('spentMicroUsd', () => {
    const configure = (): void => {
      vi.spyOn(AppConfig, 'get').mockReturnValue({
        AUTH_SERVICE_URL: 'https://auth-service:4001',
        INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
      } as never);
    };

    it('reads the settled spend of the budget row', async () => {
      configure();
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ settledMicroUsd: 8227 }), { status: 200 }),
        );
      vi.stubGlobal('fetch', fetch);

      await expect(new ThreadBudgetClient().spentMicroUsd('budget-1')).resolves.toBe(8227);
      expect(fetch).toHaveBeenCalledWith(
        'https://auth-service:4001/api/v1/internal/threads/budgets/summary',
        expect.objectContaining({ body: JSON.stringify({ budgetId: 'budget-1' }) }),
      );
    });

    it('reports the Free meter money for a job that settled nothing', async () => {
      configure();
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ settledMicroUsd: 0, freeAllowanceMicroUsd: 4100 })),
          ),
      );
      await expect(new ThreadBudgetClient().spentMicroUsd('b')).resolves.toBe(4100);
    });

    it('treats an absent freeAllowanceMicroUsd as zero', async () => {
      configure();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ settledMicroUsd: 90 }))),
      );
      await expect(new ThreadBudgetClient().spentMicroUsd('b')).resolves.toBe(90);
    });

    it('rejects a negative freeAllowanceMicroUsd', async () => {
      configure();
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ settledMicroUsd: 0, freeAllowanceMicroUsd: -5 })),
          ),
      );
      await expect(new ThreadBudgetClient().spentMicroUsd('b')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('fails closed on an error status or an invalid body', async () => {
      configure();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
      await expect(new ThreadBudgetClient().spentMicroUsd('b')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ settledMicroUsd: -1 }))),
      );
      await expect(new ThreadBudgetClient().spentMicroUsd('b')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
