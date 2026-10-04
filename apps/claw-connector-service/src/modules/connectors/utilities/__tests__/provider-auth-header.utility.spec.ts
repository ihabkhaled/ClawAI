import { type ConnectorProviderDefinition } from '../../../../generated/prisma';
import { buildAuthHeaderValue, withCustomAuthHeader } from '../provider-auth-header.utility';

const definition = (name: string, scheme: string, isBuiltIn = false): ConnectorProviderDefinition =>
  ({ authHeaderName: name, authHeaderScheme: scheme, isBuiltIn }) as ConnectorProviderDefinition;

describe('provider auth header', () => {
  it('prefixes the scheme, or sends the raw key when the scheme is empty', () => {
    expect(buildAuthHeaderValue({ name: 'Authorization', scheme: 'Bearer' }, 'k')).toBe('Bearer k');
    expect(buildAuthHeaderValue({ name: 'apikey', scheme: '' }, 'k')).toBe('k');
  });

  it('adds a custom header to the execution config and leaves Bearer providers alone', () => {
    const config = { provider: 'X', apiKey: 'k', gatewayHeaders: { 'x-team': 'a' } };

    expect(withCustomAuthHeader(config, definition('apikey', ''))).toEqual({
      'x-team': 'a',
      apikey: 'k',
    });
    expect(withCustomAuthHeader(config, definition('Authorization', 'Bearer'))).toEqual({
      'x-team': 'a',
    });
    expect(withCustomAuthHeader(config, definition('apikey', '', true))).toEqual({ 'x-team': 'a' });
    expect(withCustomAuthHeader({ ...config, apiKey: '' }, definition('apikey', ''))).toEqual({
      'x-team': 'a',
    });
  });
});
