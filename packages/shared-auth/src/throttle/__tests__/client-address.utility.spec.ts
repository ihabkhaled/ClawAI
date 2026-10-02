import { vi } from 'vitest';

import { normalizeIpAddress, resolveClientAddress } from '../client-address.utility';
import { resetTrustedProxyCache } from '../trusted-proxy';

const { mockedLookup } = vi.hoisted(() => ({
  mockedLookup:
    vi.fn<
      (hostname: string, options: { all: true }) => Promise<{ address: string; family: number }[]>
    >(),
}));
vi.mock('node:dns/promises', () => ({ lookup: mockedLookup }));

describe('normalizeIpAddress', () => {
  it.each([
    [' 203.0.113.7 ', '203.0.113.7'],
    ['::ffff:172.18.0.4', '172.18.0.4'],
    ['2001:DB8::1', '2001:db8::1'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeIpAddress(input)).toBe(expected);
  });

  it.each([undefined, '', 'localhost', '1.2.3.4, 5.6.7.8', '999.1.1.1'])(
    'returns null for %s',
    (input) => {
      expect(normalizeIpAddress(input)).toBeNull();
    },
  );
});

describe('resolveClientAddress', () => {
  beforeEach(() => {
    resetTrustedProxyCache();
    mockedLookup.mockReset();
    mockedLookup.mockResolvedValue([{ address: '172.18.0.29', family: 4 }]);
  });

  it('believes X-Real-IP when the peer is nginx', async () => {
    await expect(
      resolveClientAddress({ 'x-real-ip': '203.0.113.7' }, '::ffff:172.18.0.29'),
    ).resolves.toEqual({ address: '203.0.113.7', viaProxy: true });
  });

  it('counts a LAN peer spoofing X-Real-IP by its own address', async () => {
    await expect(
      resolveClientAddress({ 'x-real-ip': '203.0.113.7' }, '192.168.1.50'),
    ).resolves.toEqual({ address: '192.168.1.50', viaProxy: false });
  });

  it('takes the first value of a repeated header and ignores a non-address', async () => {
    await expect(
      resolveClientAddress({ 'x-real-ip': ['203.0.113.8', '1.1.1.1'] }, '172.18.0.29'),
    ).resolves.toEqual({ address: '203.0.113.8', viaProxy: true });
    await expect(
      resolveClientAddress({ 'x-real-ip': 'not-an-ip' }, '172.18.0.29'),
    ).resolves.toEqual({ address: '172.18.0.29', viaProxy: false });
  });

  it('does not look the proxy up when there is no X-Real-IP', async () => {
    await expect(resolveClientAddress({}, '172.18.0.40')).resolves.toEqual({
      address: '172.18.0.40',
      viaProxy: false,
    });
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('returns null for an unknown peer, whatever the header says', async () => {
    await expect(resolveClientAddress({ 'x-real-ip': '203.0.113.7' }, undefined)).resolves.toBe(
      null,
    );
  });
});
