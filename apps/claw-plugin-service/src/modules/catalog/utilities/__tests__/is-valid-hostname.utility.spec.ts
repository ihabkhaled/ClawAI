import { isValidHostname } from '../is-valid-hostname.utility';

describe('isValidHostname', () => {
  it.each(['api.example.com', '*.example.com', 'geocoding-api.open-meteo.com', 'a1.co'])(
    'accepts %s',
    (host) => {
      expect(isValidHostname(host)).toBe(true);
    },
  );

  it.each([
    '',
    '*.',
    'localhost',
    '10.0.0.1',
    'example',
    'example.123',
    'Example.com',
    'a..b.com',
    '-a.example.com',
    'a-.example.com',
    'a b.example.com',
    'example.com:443',
    'example.com/path',
    `${'a'.repeat(64)}.com`,
    `${'a.'.repeat(130)}com`,
  ])('rejects %s', (host) => {
    expect(isValidHostname(host)).toBe(false);
  });
});
