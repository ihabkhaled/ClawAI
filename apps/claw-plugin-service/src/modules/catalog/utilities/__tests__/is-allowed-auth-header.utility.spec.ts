import { isAllowedAuthHeader } from '../is-allowed-auth-header.utility';

describe('isAllowedAuthHeader', () => {
  it.each(['Authorization', 'authorization', 'X-API-Key', 'Api-Key', 'X-Custom-Token'])(
    'allows %s',
    (name) => {
      expect(isAllowedAuthHeader(name)).toBe(true);
    },
  );

  it.each([
    'Host',
    'Cookie',
    'Content-Length',
    'Transfer-Encoding',
    'Connection',
    'Upgrade',
    'Mcp-Session-Id',
    'Proxy-Authorization',
    'Sec-Fetch-Mode',
    'Accept',
    'X-',
    'Authorization2',
  ])('refuses %s', (name) => {
    expect(isAllowedAuthHeader(name)).toBe(false);
  });
});
