import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
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

  describe('close', () => {
    const configure = (): void => {
      vi.spyOn(AppConfig, 'get').mockReturnValue({
        AUTH_SERVICE_URL: 'https://auth-service:4001',
        INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
      } as never);
    };

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

  describe('settledMicroUsd', () => {
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

      await expect(new ThreadBudgetClient().settledMicroUsd('budget-1')).resolves.toBe(8227);
      expect(fetch).toHaveBeenCalledWith(
        'https://auth-service:4001/api/v1/internal/threads/budgets/summary',
        expect.objectContaining({ body: JSON.stringify({ budgetId: 'budget-1' }) }),
      );
    });

    it('fails closed on an error status or an invalid body', async () => {
      configure();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
      await expect(new ThreadBudgetClient().settledMicroUsd('b')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ settledMicroUsd: -1 }))),
      );
      await expect(new ThreadBudgetClient().settledMicroUsd('b')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
