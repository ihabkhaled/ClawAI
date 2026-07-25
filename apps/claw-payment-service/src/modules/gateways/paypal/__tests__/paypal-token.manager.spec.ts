import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { PaypalTokenManager } from '../managers/paypal-token.manager';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;

const tokenOk = (expiresIn: number) => ({
  ok: true,
  status: 200,
  data: { access_token: 'tok-1', token_type: 'Bearer', expires_in: expiresIn },
});

describe('PaypalTokenManager', () => {
  let manager: PaypalTokenManager;

  beforeEach(() => {
    mockHttp.mockReset();
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYPAL_ENV: 'sandbox',
      PAYPAL_CLIENT_ID: 'id',
      PAYPAL_CLIENT_SECRET: 'secret',
      PAYPAL_WEBHOOK_ID: 'WH1',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    manager = new PaypalTokenManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches a token on first use', async () => {
    mockHttp.mockResolvedValue(tokenOk(32_400));
    await expect(manager.getAccessToken(0)).resolves.toBe('tok-1');
    expect(mockHttp).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached token while it is still valid', async () => {
    mockHttp.mockResolvedValue(tokenOk(3_600));
    await manager.getAccessToken(0);
    await manager.getAccessToken(1_000_000);
    expect(mockHttp).toHaveBeenCalledTimes(1);
  });

  it('refreshes BEFORE the token actually expires', async () => {
    // The 60s margin exists so a token cannot expire in flight — valid when
    // checked, dead by the time the request lands, surfacing as a random 401
    // in the middle of a payment.
    mockHttp.mockResolvedValue(tokenOk(3_600));
    await manager.getAccessToken(0);
    // 3540s in: PayPal still considers it valid, but we are inside the margin.
    await manager.getAccessToken(3_540_000);
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it('re-authenticates after invalidate()', async () => {
    mockHttp.mockResolvedValue(tokenOk(3_600));
    await manager.getAccessToken(0);
    manager.invalidate();
    await manager.getAccessToken(1_000);
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it('posts form-encoded credentials, not JSON', async () => {
    mockHttp.mockResolvedValue(tokenOk(3_600));
    await manager.getAccessToken(0);
    const call = mockHttp.mock.calls[0]?.[0];
    expect(call?.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(call?.body).toBe('grant_type=client_credentials');
    expect(call?.headers?.Authorization).toMatch(/^Basic /);
  });

  it('refuses when PayPal credentials are absent', async () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYPAL_ENV: 'sandbox',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    await expect(manager.getAccessToken(0)).rejects.toThrow();
    expect(mockHttp).not.toHaveBeenCalled();
  });

  it('throws when PayPal rejects the credentials', async () => {
    mockHttp.mockResolvedValue({ ok: false, status: 401, data: {} });
    await expect(manager.getAccessToken(0)).rejects.toThrow();
  });

  it('throws when the token response fails schema validation', async () => {
    mockHttp.mockResolvedValue({ ok: true, status: 200, data: { token_type: 'Bearer' } });
    await expect(manager.getAccessToken(0)).rejects.toThrow();
  });

  it('targets the sandbox host in sandbox mode and the live host in live mode', () => {
    expect(PaypalTokenManager.baseUrl()).toContain('sandbox');
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYPAL_ENV: 'live',
    } as unknown as ReturnType<typeof AppConfig.get>);
    expect(PaypalTokenManager.baseUrl()).not.toContain('sandbox');
  });
});
