import { isIP } from 'node:net';
import { isPublicRoutableIp, resolveRegistrationOrigin } from '../registration-origin.utility';

const fetchCountry = vi.hoisted(() => vi.fn());
vi.mock('../../../../common/utilities/geoip.utility', () => ({ lookupCountryCode: fetchCountry }));

const resolveClientAddress = vi.hoisted(() => vi.fn());
vi.mock('@claw/shared-auth', () => ({
  resolveClientAddress,
  normalizeIpAddress: (value: string) => {
    const bare = value.startsWith('::ffff:') ? value.slice(7) : value;
    return isIP(bare) === 0 ? null : bare;
  },
}));

describe('isPublicRoutableIp', () => {
  it.each(['8.8.8.8', '41.33.1.1', '172.15.0.1', '172.32.0.1', '2a00:1450:4001::1'])(
    '%s is public',
    (ip) => {
      expect(isPublicRoutableIp(ip)).toBe(true);
    },
  );

  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '127.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '172.18.0.4',
    '192.168.1.10',
    '100.64.0.1',
    '169.254.1.1',
    '224.0.0.1',
    '::',
    '::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    'not-an-ip',
    '',
  ])('%s is not routable', (ip) => {
    expect(isPublicRoutableIp(ip)).toBe(false);
  });
});

describe('resolveRegistrationOrigin', () => {
  beforeEach(() => {
    resolveClientAddress.mockReset();
    fetchCountry.mockReset().mockReturnValue('EG');
  });

  it('stores the proxy-resolved address and its offline country', async () => {
    resolveClientAddress.mockResolvedValue({ address: '41.33.1.1', viaProxy: true });
    await expect(
      resolveRegistrationOrigin({ 'x-real-ip': '41.33.1.1' }, '172.18.0.2'),
    ).resolves.toEqual({
      ip: '41.33.1.1',
      countryCode: 'EG',
    });
    expect(resolveClientAddress).toHaveBeenCalledWith({ 'x-real-ip': '41.33.1.1' }, '172.18.0.2');
  });

  it('keeps a private address but never looks its country up', async () => {
    resolveClientAddress.mockResolvedValue({ address: '172.18.0.1', viaProxy: true });
    await expect(resolveRegistrationOrigin({}, '172.18.0.2')).resolves.toEqual({
      ip: '172.18.0.1',
      countryCode: null,
    });
    expect(fetchCountry).not.toHaveBeenCalled();
  });

  it('strips the IPv4-mapped IPv6 prefix', async () => {
    resolveClientAddress.mockResolvedValue({ address: '::ffff:8.8.8.8', viaProxy: false });
    const origin = await resolveRegistrationOrigin({}, '::ffff:8.8.8.8');
    expect(origin.ip).toBe('8.8.8.8');
  });

  it('records nothing when no address can be resolved', async () => {
    resolveClientAddress.mockResolvedValue(null);
    await expect(resolveRegistrationOrigin({}, undefined)).resolves.toEqual({
      ip: null,
      countryCode: null,
    });
  });

  it('records nothing for a value that is not an IP address', async () => {
    resolveClientAddress.mockResolvedValue({ address: 'evil<script>', viaProxy: false });
    await expect(resolveRegistrationOrigin({}, 'x')).resolves.toEqual({
      ip: null,
      countryCode: null,
    });
  });
});
