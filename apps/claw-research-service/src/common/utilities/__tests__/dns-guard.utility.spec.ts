import type { PinnedAddress } from '../../types/ip-address.types';
import { hostResolution, resolvePinnedAddress } from '../dns-guard.utility';

describe('resolvePinnedAddress (TD-031)', () => {
  const original = hostResolution.resolve;
  const resolver = (answers: PinnedAddress[]): ReturnType<typeof vi.fn> => {
    const fake = vi.fn().mockResolvedValue(answers);
    hostResolution.resolve = fake;
    return fake;
  };

  afterEach(() => {
    hostResolution.resolve = original;
  });

  it('resolves exactly once and returns the validated address', async () => {
    const fake = resolver([{ address: '93.184.216.34', family: 4 }]);

    await expect(resolvePinnedAddress('example.com', { allowPrivate: false })).resolves.toEqual({
      address: '93.184.216.34',
      family: 4,
    });
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it('refuses a name answering public first and private second', async () => {
    resolver([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(resolvePinnedAddress('rebind.test', { allowPrivate: false })).rejects.toThrow(
      /private\/loopback/u,
    );
  });

  it.each(['::ffff:127.0.0.1', '::ffff:7f00:1', 'fc00::1', '100.64.0.9', '::1'])(
    'refuses a name that answers %s among public records',
    async (hidden) => {
      resolver([
        { address: '2606:4700:4700::1111', family: 6 },
        { address: hidden, family: hidden.includes(':') ? 6 : 4 },
      ]);

      await expect(resolvePinnedAddress('rebind.test', { allowPrivate: false })).rejects.toThrow();
    },
  );

  it('admits a private answer only for an allowlisted host', async () => {
    resolver([{ address: '10.0.0.5', family: 4 }]);

    await expect(resolvePinnedAddress('wiki.internal', { allowPrivate: true })).resolves.toEqual({
      address: '10.0.0.5',
      family: 4,
    });
  });

  it.each(['169.254.169.254', 'fd00:ec2::254', '::ffff:169.254.169.254'])(
    'never admits metadata %s, even for an allowlisted host',
    async (address) => {
      resolver([{ address, family: address.includes(':') ? 6 : 4 }]);

      await expect(resolvePinnedAddress('wiki.internal', { allowPrivate: true })).rejects.toThrow(
        /metadata/u,
      );
    },
  );

  it('does not resolve an IP literal and still validates it', async () => {
    const fake = resolver([]);

    await expect(resolvePinnedAddress('127.0.0.1', { allowPrivate: false })).rejects.toThrow();
    await expect(resolvePinnedAddress('[::1]', { allowPrivate: false })).rejects.toThrow();
    expect(fake).not.toHaveBeenCalled();
  });

  it('fails when the name resolves to nothing', async () => {
    resolver([]);

    await expect(resolvePinnedAddress('nowhere.test', { allowPrivate: false })).rejects.toThrow(
      /did not resolve/u,
    );
  });
});
