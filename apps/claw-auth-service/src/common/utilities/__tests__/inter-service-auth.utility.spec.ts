import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';

jest.mock('../../../app/config/app.config');

describe('buildInterServiceAuthHeader', () => {
  it('uses the canonical shared inter-service token', () => {
    jest.mocked(AppConfig.get).mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'service-token-with-at-least-32-characters',
    } as ReturnType<typeof AppConfig.get>);

    expect(buildInterServiceAuthHeader()).toBe('Service service-token-with-at-least-32-characters');
  });
});
