import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';

jest.mock('../../../app/config/app.config');

const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

describe('buildInterServiceAuthHeader (chat-service)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "Service <token>" using INTER_SERVICE_AUTH_TOKEN from AppConfig', () => {
    AppConfig.get.mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'super-secret-32-chars-token-aaaaaaaa',
    });

    const header = buildInterServiceAuthHeader();

    expect(header).toBe('Service super-secret-32-chars-token-aaaaaaaa');
    expect(AppConfig.get).toHaveBeenCalledTimes(1);
  });

  it('re-reads the token on every call (no caching at the utility layer)', () => {
    AppConfig.get
      .mockReturnValueOnce({ INTER_SERVICE_AUTH_TOKEN: 'token-one-aaaaaaaaaaaaaaaaaaaaaa' })
      .mockReturnValueOnce({ INTER_SERVICE_AUTH_TOKEN: 'token-two-bbbbbbbbbbbbbbbbbbbbbb' });

    expect(buildInterServiceAuthHeader()).toBe('Service token-one-aaaaaaaaaaaaaaaaaaaaaa');
    expect(buildInterServiceAuthHeader()).toBe('Service token-two-bbbbbbbbbbbbbbbbbbbbbb');
    expect(AppConfig.get).toHaveBeenCalledTimes(2);
  });
});
