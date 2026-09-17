import { vi } from 'vitest';
import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';


// AppConfig exposes a STATIC get(); neither a bare automock nor importMock
// hands that same static back, so the spec configured one object while the code
// under test read another. A hoisted vi.fn keeps both on one mock.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };

describe('buildInterServiceAuthHeader (file-generation-service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
