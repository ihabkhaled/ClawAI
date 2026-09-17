import { vi } from 'vitest';
import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';

// AppConfig exposes a STATIC get(); a bare automock does not hand that static
// back through importMock, so the spec configured one object and the utility
// read another. An explicit factory keeps both on the same vi.fn.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };

describe('buildInterServiceAuthHeader (image-service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "Service <token>" using INTER_SERVICE_AUTH_TOKEN from AppConfig', () => {
    AppConfig.get.mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'image-service-secret-token-aaaaaaaa',
    });

    const header = buildInterServiceAuthHeader();

    expect(header).toBe('Service image-service-secret-token-aaaaaaaa');
    expect(AppConfig.get).toHaveBeenCalledTimes(1);
  });
});
