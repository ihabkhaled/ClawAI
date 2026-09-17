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

describe('buildInterServiceAuthHeader (chat-service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
