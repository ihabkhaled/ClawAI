import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';

jest.mock('../../../app/config/app.config');

const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

describe('buildInterServiceAuthHeader (file-generation-service)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "Service <token>" using INTER_SERVICE_AUTH_TOKEN from AppConfig', () => {
    AppConfig.get.mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'file-gen-service-secret-aaaaaaaaaa',
    });

    const header = buildInterServiceAuthHeader();

    expect(header).toBe('Service file-gen-service-secret-aaaaaaaaaa');
    expect(AppConfig.get).toHaveBeenCalledTimes(1);
  });
});
