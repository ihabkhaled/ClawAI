import { lookupCountryCode } from '../geoip.utility';

describe('lookupCountryCode (offline geoip-country)', () => {
  it.each([
    ['8.8.8.8', 'US'],
    ['41.33.1.1', 'EG'],
    ['2a00:1450:4001::1', 'DE'],
  ])('%s resolves to %s with no network call', (ip, country) => {
    expect(lookupCountryCode(ip)).toBe(country);
  });

  it.each(['10.0.0.1', '127.0.0.1', 'garbage', ''])('%s resolves to null', (ip) => {
    expect(lookupCountryCode(ip)).toBeNull();
  });
});
