import { AppConfig } from '../../../../app/config/app.config';
import { LiveCloseTokenManager } from '../live-close-token.manager';

describe('LiveCloseTokenManager', () => {
  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({ JWT_SECRET: 's'.repeat(40) } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues a 12 h token that verifies only for its own session', () => {
    const manager = new LiveCloseTokenManager();
    const now = 1_800_000_000_000;
    const token = manager.issue('sess1', 'u1', now);
    expect(manager.verify(token, 'sess1', now)).toMatchObject({ sessionId: 'sess1', userId: 'u1' });
    expect(manager.verify(token, 'sess2', now)).toBeNull();
    expect(manager.verify(token, 'sess1', now + 12 * 3_600_000)).toBeNull();
  });
});
