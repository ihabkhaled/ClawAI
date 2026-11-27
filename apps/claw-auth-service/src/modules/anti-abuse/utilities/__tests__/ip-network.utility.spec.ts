import { expandIpv6, toRegistrationNetwork } from '../ip-network.utility';

describe('toRegistrationNetwork', () => {
  it('reduces IPv4 to its /24', () => {
    expect(toRegistrationNetwork('203.0.113.77')).toBe('203.0.113.0/24');
    expect(toRegistrationNetwork('8.8.8.8')).toBe('8.8.8.0/24');
  });

  // Each expected value is what Postgres prints for
  // network(set_masklen('<ip>'::inet, 48))::text, so migrated and new rows match.
  it.each([
    ['2001:db8:1:2::5', '2001:db8:1::/48'],
    ['2001:db8:0:2::5', '2001:db8::/48'],
    ['2001:0:0:2::5', '2001::/48'],
    ['2001:0:1:2::5', '2001:0:1::/48'],
    ['2001:0DB8:0001:ffff:0:0:0:1', '2001:db8:1::/48'],
    ['::1', '::/48'],
    ['64:ff9b::192.0.2.33', '64:ff9b::/48'],
  ])('reduces IPv6 %s to %s', (ip, network) => {
    expect(toRegistrationNetwork(ip)).toBe(network);
  });

  it('answers null for no address, a zone id or garbage', () => {
    expect(toRegistrationNetwork(null)).toBeNull();
    expect(toRegistrationNetwork('fe80::1%eth0')).toBeNull();
    expect(toRegistrationNetwork('not-an-ip')).toBeNull();
  });

  it('expands :: and an IPv4 tail into eight groups', () => {
    expect(expandIpv6('2001:db8::1')).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
    expect(expandIpv6('::ffff:1.2.3.4')).toEqual([0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
    expect(expandIpv6('1:2:3')).toBeNull();
  });
});
