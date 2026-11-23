const { pinnedGet, config } = vi.hoisted(() => ({
  pinnedGet: vi.fn(),
  config: { LIVE_TWITCH_CLIENT_ID: 'public-web-player-id' },
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: () => config } }));
vi.mock('../../../../common/utilities/pinned-request.utility', () => ({ pinnedGet }));

import { LivePlatform } from '../../../../generated/prisma';
import { ServerPullResolverService } from '../server-pull-resolver.service';

const allowed = JSON.stringify({
  data: {
    streamPlaybackAccessToken: {
      value: JSON.stringify({ authorization: { forbidden: false } }),
      signature: 'abc',
    },
  },
});

describe('ServerPullResolverService', () => {
  const guard = { assertSafeOnSuffixes: vi.fn().mockResolvedValue(['151.101.1.1']) };
  const fetcher = { fetchObject: vi.fn() };
  const service = new ServerPullResolverService(guard as never, fetcher as never);

  beforeEach(() => {
    vi.clearAllMocks();
    config.LIVE_TWITCH_CLIENT_ID = 'public-web-player-id';
    guard.assertSafeOnSuffixes.mockResolvedValue(['151.101.1.1']);
  });

  it('supports Twitch only; YouTube, Kick and a missing platform are never pulled', () => {
    expect(service.supports(LivePlatform.TWITCH)).toBe(true);
    expect(service.supports(LivePlatform.YOUTUBE)).toBe(false);
    expect(service.supports(LivePlatform.KICK)).toBe(false);
    expect(service.supports(null)).toBe(false);
    expect(service.hostSuffixes(LivePlatform.TWITCH)).toEqual(['ttvnw.net', 'live-video.net']);
    expect(service.hostSuffixes(LivePlatform.YOUTUBE)).toBeNull();
  });

  it('asks the GQL endpoint through the guard and builds the usher playlist URL', async () => {
    pinnedGet.mockResolvedValueOnce({
      status: 200,
      contentType: 'application/json',
      body: Buffer.from(allowed),
    });
    const url = await service.resolvePlaylist(LivePlatform.TWITCH, 'xqc');
    expect(guard.assertSafeOnSuffixes).toHaveBeenCalledWith(new URL('https://gql.twitch.tv/gql'), [
      'gql.twitch.tv',
    ]);
    const [, addresses, options] = pinnedGet.mock.calls[0] as [
      URL,
      string[],
      Record<string, unknown>,
    ];
    expect(addresses).toEqual(['151.101.1.1']);
    expect(options).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'client-id': 'public-web-player-id' }),
    });
    expect(JSON.parse(String(options.body))).toMatchObject({ variables: { login: 'xqc' } });
    expect(url?.origin + (url?.pathname ?? '')).toBe(
      'https://usher.ttvnw.net/api/channel/hls/xqc.m3u8',
    );
    expect(url?.searchParams.get('sig')).toBe('abc');
    expect(url?.searchParams.get('allow_audio_only')).toBe('true');
  });

  it('returns null (never throws) when the token call fails, and for YouTube makes no request', async () => {
    pinnedGet.mockRejectedValueOnce(new Error('FAILED'));
    await expect(service.resolvePlaylist(LivePlatform.TWITCH, 'xqc')).resolves.toBeNull();
    await expect(service.resolvePlaylist(LivePlatform.YOUTUBE, 'dQw4w9WgXcQ')).resolves.toBeNull();
    expect(pinnedGet).toHaveBeenCalledTimes(1);
  });

  it('probes live only when the playlist answers on the CDN suffixes', async () => {
    pinnedGet.mockResolvedValue({
      status: 200,
      contentType: 'application/json',
      body: Buffer.from(allowed),
    });
    fetcher.fetchObject.mockResolvedValueOnce({ body: Buffer.from('#EXTM3U') });
    await expect(service.probe(LivePlatform.TWITCH, 'xqc')).resolves.toBe(true);
    expect(fetcher.fetchObject).toHaveBeenCalledWith(
      expect.any(URL),
      ['ttvnw.net', 'live-video.net'],
      expect.any(Number),
    );
    fetcher.fetchObject.mockRejectedValueOnce(new Error('LIVE_UPSTREAM_FAILED'));
    await expect(service.probe(LivePlatform.TWITCH, 'offline')).resolves.toBe(false);
    await expect(service.probe(LivePlatform.KICK, 'xqc')).resolves.toBe(false);
  });

  it('turns Twitch off with no request when LIVE_TWITCH_CLIENT_ID is empty', async () => {
    config.LIVE_TWITCH_CLIENT_ID = '';
    expect(service.supports(LivePlatform.TWITCH)).toBe(false);
    await expect(service.resolvePlaylist(LivePlatform.TWITCH, 'xqc')).resolves.toBeNull();
    expect(pinnedGet).not.toHaveBeenCalled();
  });
});
