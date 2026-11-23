vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ LIVE_ALLOW_HTTP_SOURCES: false }) },
}));

import { UnprocessableEntityException } from '@nestjs/common';

import { SourceUrlGuardService } from '../source-url-guard.service';

describe('SourceUrlGuardService', () => {
  const guard = new SourceUrlGuardService();

  afterEach(() => vi.restoreAllMocks());

  it.each([
    'https://127.0.0.1/a.m3u8',
    'https://[::1]/a.m3u8',
    'https://10.1.2.3/a.m3u8',
    'https://169.254.169.254/latest/a.m3u8',
    'https://[::ffff:127.0.0.1]/a.m3u8',
    'https://0.0.0.0/a.m3u8',
    'https://[fd00::1]/a.m3u8',
    'https://100.64.1.1/a.m3u8',
  ])('refuses the IP literal %s', async (url) => {
    await expect(guard.assertSafe(new URL(url))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('returns a public IP literal as the only address', async () => {
    await expect(guard.assertSafe(new URL('https://8.8.8.8/a.m3u8'))).resolves.toEqual(['8.8.8.8']);
  });

  it('refuses a host name resolving to any private address', async () => {
    vi.spyOn(guard, 'resolveHost').mockResolvedValueOnce(['93.184.216.34', '10.0.0.1']);
    await expect(guard.assertSafe(new URL('https://cdn.example.com/a.m3u8'))).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
  });

  it('refuses a host that does not resolve', async () => {
    vi.spyOn(guard, 'resolveHost').mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(guard.assertSafe(new URL('https://nx.example/a.m3u8'))).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
  });

  it('returns every validated public address', async () => {
    vi.spyOn(guard, 'resolveHost').mockResolvedValueOnce(['93.184.216.34', '2606:2800:220:1::1']);
    await expect(guard.assertSafe(new URL('https://cdn.example.com/a.m3u8'))).resolves.toEqual([
      '93.184.216.34',
      '2606:2800:220:1::1',
    ]);
  });

  it('enforces the pinned host', async () => {
    await expect(
      guard.assertSafe(new URL('https://other.example/a.ts'), 'cdn.example.com'),
    ).rejects.toThrow('LIVE_SOURCE_UNSAFE');
    await expect(guard.assertSafe(new URL('https://cdn.example.com/a.ts'), null)).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
    vi.spyOn(guard, 'resolveHost').mockResolvedValueOnce(['93.184.216.34']);
    await expect(
      guard.assertSafe(new URL('https://cdn.example.com/a.ts'), 'cdn.example.com'),
    ).resolves.toEqual(['93.184.216.34']);
  });

  it('pins a server-pulled fetch to host suffixes, never a look-alike domain or a private address', async () => {
    const suffixes = ['ttvnw.net', 'live-video.net'];
    for (const url of [
      'https://ttvnw.net.evil.example/a.ts',
      'https://evilttvnw.net/a.ts',
      'http://x.playlist.ttvnw.net/a.m3u8',
      'https://user:pw@x.ttvnw.net/a.ts',
    ]) {
      await expect(guard.assertSafeOnSuffixes(new URL(url), suffixes)).rejects.toThrow(
        'LIVE_SOURCE_UNSAFE',
      );
    }
    vi.spyOn(guard, 'resolveHost').mockResolvedValueOnce(['10.0.0.5']);
    await expect(
      guard.assertSafeOnSuffixes(new URL('https://x.playlist.ttvnw.net/a.m3u8'), suffixes),
    ).rejects.toThrow('LIVE_SOURCE_UNSAFE');
    vi.spyOn(guard, 'resolveHost').mockResolvedValueOnce(['99.84.1.1']);
    await expect(
      guard.assertSafeOnSuffixes(new URL('https://a1.j.cloudfront.hls.ttvnw.net/s.ts'), suffixes),
    ).resolves.toEqual(['99.84.1.1']);
  });

  it('refuses plain http when not allowed, userinfo and odd ports', async () => {
    for (const url of [
      'http://cdn.example.com/a.m3u8',
      'https://u:p@cdn.example.com/a.m3u8',
      'https://cdn.example.com:22/a.m3u8',
    ]) {
      await expect(guard.assertSafe(new URL(url))).rejects.toThrow('LIVE_SOURCE_UNSAFE');
    }
  });

  it('resolves localhost through real DNS and refuses it', async () => {
    await expect(guard.assertSafe(new URL('https://localhost/a.m3u8'))).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
  });
});
