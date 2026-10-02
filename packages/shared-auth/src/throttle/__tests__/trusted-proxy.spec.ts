import { vi } from 'vitest';

import { isTrustedProxyAddress, resetTrustedProxyCache } from '../trusted-proxy';

const { mockedLookup } = vi.hoisted(() => ({
  mockedLookup:
    vi.fn<
      (hostname: string, options: { all: true }) => Promise<{ address: string; family: number }[]>
    >(),
}));
vi.mock('node:dns/promises', () => ({ lookup: mockedLookup }));

const NGINX = '172.18.0.29';

describe('isTrustedProxyAddress', () => {
  const originalList = process.env['TRUSTED_PROXY_ADDRESSES'];

  beforeEach(() => {
    vi.useRealTimers();
    resetTrustedProxyCache();
    delete process.env['TRUSTED_PROXY_ADDRESSES'];
    mockedLookup.mockReset();
    mockedLookup.mockResolvedValue([{ address: NGINX, family: 4 }]);
  });

  afterAll(() => {
    vi.useRealTimers();
    if (originalList === undefined) {
      delete process.env['TRUSTED_PROXY_ADDRESSES'];
    } else {
      process.env['TRUSTED_PROXY_ADDRESSES'] = originalList;
    }
  });

  it('trusts the address the docker name `nginx` resolves to', async () => {
    await expect(isTrustedProxyAddress(NGINX)).resolves.toBe(true);
    expect(mockedLookup).toHaveBeenCalledWith('nginx', { all: true });
  });

  it('strips an IPv4-mapped prefix from the resolved address', async () => {
    mockedLookup.mockResolvedValue([{ address: '::FFFF:172.18.0.29', family: 6 }]);
    await expect(isTrustedProxyAddress(NGINX)).resolves.toBe(true);
  });

  it.each(['192.168.1.50', '10.0.0.8', '100.64.0.1', '172.18.0.44', '198.51.100.9'])(
    'does not trust %s just because it is private or on the same network',
    async (peer) => {
      await expect(isTrustedProxyAddress(peer)).resolves.toBe(false);
    },
  );

  it.each(['127.0.0.1', '127.8.8.8', '::1'])(
    'trusts loopback %s without a lookup',
    async (peer) => {
      await expect(isTrustedProxyAddress(peer)).resolves.toBe(true);
      expect(mockedLookup).not.toHaveBeenCalled();
    },
  );

  it('trusts addresses and CIDRs from TRUSTED_PROXY_ADDRESSES (distributed nginx)', async () => {
    process.env['TRUSTED_PROXY_ADDRESSES'] =
      ' 198.51.100.7 , 203.0.113.0/28, 2001:db8::/32, junk, 10.0.0.0/99, 1.2.3.4/x';
    await expect(isTrustedProxyAddress('198.51.100.7')).resolves.toBe(true);
    await expect(isTrustedProxyAddress('203.0.113.14')).resolves.toBe(true);
    await expect(isTrustedProxyAddress('2001:db8::5')).resolves.toBe(true);
    await expect(isTrustedProxyAddress('203.0.113.16')).resolves.toBe(false);
    await expect(isTrustedProxyAddress('10.0.0.1')).resolves.toBe(false);
    await expect(isTrustedProxyAddress('1.2.3.4')).resolves.toBe(false);
  });

  it('re-reads the list when the variable changes', async () => {
    process.env['TRUSTED_PROXY_ADDRESSES'] = '198.51.100.7';
    await expect(isTrustedProxyAddress('198.51.100.7')).resolves.toBe(true);
    process.env['TRUSTED_PROXY_ADDRESSES'] = '';
    await expect(isTrustedProxyAddress('198.51.100.7')).resolves.toBe(false);
  });

  it('trusts nothing extra when the name does not resolve (no docker nginx)', async () => {
    mockedLookup.mockRejectedValue(new Error('ENOTFOUND'));
    await expect(isTrustedProxyAddress(NGINX)).resolves.toBe(false);
  });

  it('shares one lookup between concurrent callers and caches the answer', async () => {
    await Promise.all([isTrustedProxyAddress(NGINX), isTrustedProxyAddress(NGINX)]);
    await isTrustedProxyAddress(NGINX);
    await isTrustedProxyAddress('172.18.0.44');
    expect(mockedLookup).toHaveBeenCalledTimes(1);
  });

  it('re-resolves an unknown peer after the refresh floor, so a nginx recreate is picked up', async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    await expect(isTrustedProxyAddress('172.18.0.30')).resolves.toBe(false);
    mockedLookup.mockResolvedValue([{ address: '172.18.0.30', family: 4 }]);
    vi.setSystemTime(1_000_000 + 6000);
    await expect(isTrustedProxyAddress('172.18.0.30')).resolves.toBe(true);
    expect(mockedLookup).toHaveBeenCalledTimes(2);
  });

  it('re-resolves once the cache expires', async () => {
    vi.useFakeTimers({ now: 2_000_000 });
    await isTrustedProxyAddress(NGINX);
    vi.setSystemTime(2_000_000 + 61_000);
    await isTrustedProxyAddress(NGINX);
    expect(mockedLookup).toHaveBeenCalledTimes(2);
  });
});
