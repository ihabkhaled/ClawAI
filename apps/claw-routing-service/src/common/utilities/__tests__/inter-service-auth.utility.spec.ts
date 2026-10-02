import { vi } from 'vitest';

import { buildInterServiceAuthHeader } from '../inter-service-auth.utility';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): Record<string, string> => ({
      INTER_SERVICE_AUTH_TOKEN: 'inter-service-token-for-auth-header-spec',
    }),
  },
}));

describe('buildInterServiceAuthHeader', () => {
  // ADR-144: ollama-service / llamacpp-service read exactly this scheme.
  it('builds the Service-scheme header from INTER_SERVICE_AUTH_TOKEN', () => {
    expect(buildInterServiceAuthHeader()).toBe('Service inter-service-token-for-auth-header-spec');
  });
});
