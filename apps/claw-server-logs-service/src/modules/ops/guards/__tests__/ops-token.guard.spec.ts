import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { OpsTokenGuard } from '../ops-token.guard';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('@claw/shared-utilities', () => ({ httpRequest }));

const TOKEN = `claw_ops_${'a'.repeat(43)}`;

const request = (
  authorization?: string,
): { headers: Record<string, string>; opsTokenId?: string } => ({
  headers: authorization === undefined ? {} : { authorization },
});
const contextFor = (req: ReturnType<typeof request>) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as never;

describe('OpsTokenGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      AUTH_SERVICE_URL: 'https://auth.test',
      INTER_SERVICE_AUTH_TOKEN: 's'.repeat(40),
    } as never);
  });

  it('refuses a request with no ops token, without calling auth-service', async () => {
    await expect(new OpsTokenGuard().canActivate(contextFor(request()))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(httpRequest).not.toHaveBeenCalled();
  });

  // A user session must never open the ops channel, and an ops token must
  // never be accepted as a session: different schemes, different doors.
  it('refuses a Bearer session token', async () => {
    await expect(
      new OpsTokenGuard().canActivate(contextFor(request(`Bearer ${TOKEN}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('admits a token auth-service verifies, asking with the service token and LOGS_READ', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { valid: true, tokenId: 't1', scopes: ['LOGS_READ'] },
    });
    const req = request(`Ops ${TOKEN}`);

    await expect(new OpsTokenGuard().canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.opsTokenId).toBe('t1');
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://auth.test/api/v1/internal/ops-tokens/verify',
        headers: { Authorization: `Service ${'s'.repeat(40)}` },
        body: { token: TOKEN, scope: 'LOGS_READ' },
      }),
    );
  });

  it('refuses a token auth-service rejects', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { valid: false, tokenId: null, scopes: [] },
    });

    await expect(
      new OpsTokenGuard().canActivate(contextFor(request(`Ops ${TOKEN}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  // Fails closed: an outage must not open the door.
  it('refuses every token while auth-service is down', async () => {
    httpRequest.mockRejectedValue(new Error('fetch failed'));

    await expect(
      new OpsTokenGuard().canActivate(contextFor(request(`Ops ${TOKEN}`))),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('reuses a verification for 30 seconds, then asks again', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { valid: true, tokenId: 't1', scopes: ['LOGS_READ'] },
    });
    const guard = new OpsTokenGuard();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);

    await guard.canActivate(contextFor(request(`Ops ${TOKEN}`)));
    now.mockReturnValue(20_000);
    await guard.canActivate(contextFor(request(`Ops ${TOKEN}`)));
    expect(httpRequest).toHaveBeenCalledTimes(1);

    now.mockReturnValue(40_000);
    await guard.canActivate(contextFor(request(`Ops ${TOKEN}`)));
    expect(httpRequest).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});
