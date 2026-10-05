import { ForbiddenException } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { ThreadBudgetClient } from '../thread-budget.client';

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
});
