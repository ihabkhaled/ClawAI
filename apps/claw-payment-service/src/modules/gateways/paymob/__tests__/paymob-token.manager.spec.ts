import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { PaymobTokenManager } from '../managers/paymob-token.manager';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;

describe('PaymobTokenManager', () => {
  const runtimeConfig = { getPaymobOperations: jest.fn() };

  beforeEach(() => {
    mockHttp.mockReset();
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYMOB_API_KEY: 'api-key',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    runtimeConfig.getPaymobOperations.mockResolvedValue({ apiKey: 'api-key' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exchanges the API key for an access token without logging the token', async () => {
    mockHttp.mockResolvedValue({
      ok: true,
      status: 201,
      data: { token: 'short-lived-access-token' },
    });
    const manager = new PaymobTokenManager(runtimeConfig as never);

    await expect(manager.getAccessToken(1_000)).resolves.toBe('short-lived-access-token');

    expect(mockHttp).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://accept.paymob.com/api/auth/tokens',
        method: 'POST',
        body: { api_key: 'api-key' },
      }),
    );
  });

  it('reuses a token within its bounded cache lifetime', async () => {
    mockHttp.mockResolvedValue({
      ok: true,
      status: 201,
      data: { token: 'short-lived-access-token' },
    });
    const manager = new PaymobTokenManager(runtimeConfig as never);

    await manager.getAccessToken(1_000);
    await manager.getAccessToken(2_000);

    expect(mockHttp).toHaveBeenCalledTimes(1);
  });

  it('refuses inquiry when the API key is missing', async () => {
    runtimeConfig.getPaymobOperations.mockRejectedValue(new Error('missing credentials'));
    const manager = new PaymobTokenManager(runtimeConfig as never);

    await expect(manager.getAccessToken()).rejects.toThrow();
    expect(mockHttp).not.toHaveBeenCalled();
  });
});
