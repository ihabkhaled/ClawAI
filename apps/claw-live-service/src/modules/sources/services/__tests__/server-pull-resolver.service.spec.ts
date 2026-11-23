const { pinnedGet, runBoundedProcess, config } = vi.hoisted(() => ({
  pinnedGet: vi.fn(),
  runBoundedProcess: vi.fn(),
  config: { LIVE_TWITCH_CLIENT_ID: 'public-web-player-id' },
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: () => config } }));
vi.mock('../../../../common/utilities/pinned-request.utility', () => ({ pinnedGet }));
vi.mock('../../../../common/utilities/process.utility', () => ({ runBoundedProcess }));

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
const twitch = {
  id: 'xqc',
  watchUrl: 'https://www.twitch.tv/xqc',
  embedUrl: null,
  chatEmbedUrl: null,
};
const youtube = {
  id: 'UCabc',
  watchUrl: 'https://www.youtube.com/channel/UCabc/live',
  embedUrl: null,
  chatEmbedUrl: null,
};
function ytdlpLine(line: string, exitCode = 0): { exitCode: number; stdout: Buffer } {
  return { exitCode, stdout: Buffer.from(`${line}\n`) };
}

describe('ServerPullResolverService', () => {
  const guard = { assertSafeOnSuffixes: vi.fn().mockResolvedValue(['151.101.1.1']) };
  const fetcher = { fetchObject: vi.fn() };
  let service: ServerPullResolverService;

  beforeEach(() => {
    vi.clearAllMocks();
    config.LIVE_TWITCH_CLIENT_ID = 'public-web-player-id';
    guard.assertSafeOnSuffixes.mockResolvedValue(['151.101.1.1']);
    service = new ServerPullResolverService(guard as never, fetcher as never);
  });

  it('supports every platform except Discord and a missing platform', () => {
    for (const platform of [
      LivePlatform.TWITCH,
      LivePlatform.YOUTUBE,
      LivePlatform.KICK,
      LivePlatform.FACEBOOK,
      LivePlatform.TIKTOK,
    ]) {
      expect(service.supports(platform)).toBe(true);
    }
    expect(service.supports(LivePlatform.DISCORD)).toBe(false);
    expect(service.supports(null)).toBe(false);
  });

  it('Twitch: asks the GQL endpoint through the guard and builds the usher playlist URL', async () => {
    pinnedGet.mockResolvedValueOnce({ status: 200, body: Buffer.from(allowed) });
    const pull = await service.resolve(LivePlatform.TWITCH, twitch);
    expect(guard.assertSafeOnSuffixes).toHaveBeenCalledWith(new URL('https://gql.twitch.tv/gql'), [
      'gql.twitch.tv',
    ]);
    const [, , options] = pinnedGet.mock.calls[0] as [URL, string[], Record<string, unknown>];
    expect(options).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'client-id': 'public-web-player-id' }),
    });
    expect(JSON.parse(String(options.body))).toMatchObject({ variables: { login: 'xqc' } });
    expect(`${pull?.playlist.origin ?? ''}${pull?.playlist.pathname ?? ''}`).toBe(
      'https://usher.ttvnw.net/api/channel/hls/xqc.m3u8',
    );
    expect(pull?.hostSuffixes).toEqual(['ttvnw.net', 'live-video.net']);
    expect(runBoundedProcess).not.toHaveBeenCalled();
  });

  it('yt-dlp: runs argv-only on the canonical watch URL with generic extraction off', async () => {
    runBoundedProcess.mockResolvedValueOnce(
      ytdlpLine('m3u8_native https://manifest.googlevideo.com/api/manifest/hls/index.m3u8'),
    );
    const pull = await service.resolve(LivePlatform.YOUTUBE, youtube);
    const [binary, args] = runBoundedProcess.mock.calls[0] as [string, string[]];
    expect(binary).toBe('yt-dlp');
    expect(args).toEqual(expect.arrayContaining(['--use-extractors', 'default,-generic']));
    expect(args).toEqual(expect.arrayContaining(['--match-filters', 'is_live']));
    expect(args.slice(-2)).toEqual(['--', youtube.watchUrl]);
    expect(pull?.playlist.hostname).toBe('manifest.googlevideo.com');
    expect(pull?.hostSuffixes).toEqual(['googlevideo.com']);
  });

  it('Twitch falls back to yt-dlp when LIVE_TWITCH_CLIENT_ID is empty', async () => {
    config.LIVE_TWITCH_CLIENT_ID = '';
    runBoundedProcess.mockResolvedValueOnce(
      ytdlpLine('m3u8_native https://video-weaver.fra05.hls.ttvnw.net/v1/playlist/a.m3u8'),
    );
    const pull = await service.resolve(LivePlatform.TWITCH, twitch);
    expect(pinnedGet).not.toHaveBeenCalled();
    expect(pull?.hostSuffixes).toEqual(['ttvnw.net']);
  });

  it('returns null (never throws) for offline, non-HLS, http, failure and Discord', async () => {
    runBoundedProcess
      .mockResolvedValueOnce(ytdlpLine('', 1))
      .mockResolvedValueOnce(ytdlpLine('https https://cdn.example.com/live.flv'))
      .mockResolvedValueOnce(ytdlpLine('m3u8_native http://cdn.example.com/live.m3u8'))
      .mockRejectedValueOnce(new Error('PROCESS_TIMEOUT'));
    for (const id of ['a', 'b', 'c', 'd']) {
      await expect(service.resolve(LivePlatform.KICK, { ...youtube, id })).resolves.toBeNull();
    }
    await expect(service.resolve(LivePlatform.DISCORD, youtube)).resolves.toBeNull();
    expect(runBoundedProcess).toHaveBeenCalledTimes(4);
  });

  it('caches a lookup (probe then worker spawn yt-dlp once); fresh bypasses the cache', async () => {
    runBoundedProcess.mockResolvedValue(ytdlpLine('m3u8 https://a.live-video.net/p.m3u8'));
    await service.resolve(LivePlatform.KICK, youtube);
    await service.resolve(LivePlatform.KICK, youtube);
    expect(runBoundedProcess).toHaveBeenCalledTimes(1);
    await service.resolve(LivePlatform.KICK, youtube, true);
    expect(runBoundedProcess).toHaveBeenCalledTimes(2);
  });

  it('probes live only when the playlist answers on the resolved suffixes', async () => {
    runBoundedProcess.mockResolvedValue(ytdlpLine('m3u8 https://a.live-video.net/p.m3u8'));
    fetcher.fetchObject.mockResolvedValueOnce({ body: Buffer.from('#EXTM3U') });
    await expect(service.probe(LivePlatform.KICK, youtube)).resolves.toBe(true);
    expect(fetcher.fetchObject).toHaveBeenCalledWith(
      expect.any(URL),
      ['live-video.net'],
      expect.any(Number),
    );
    fetcher.fetchObject.mockRejectedValueOnce(new Error('LIVE_UPSTREAM_FAILED'));
    await expect(service.probe(LivePlatform.KICK, youtube)).resolves.toBe(false);
    runBoundedProcess.mockResolvedValueOnce(ytdlpLine('', 1));
    await expect(service.probe(LivePlatform.RUMBLE, youtube)).resolves.toBe(false);
  });

  it('runs at most 4 yt-dlp lookups at once and answers null (fallback) past that', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((done) => {
      release = done;
    });
    runBoundedProcess.mockImplementation(async () => {
      await gate;
      return ytdlpLine('m3u8 https://a.live-video.net/p.m3u8');
    });
    const pending = ['a', 'b', 'c', 'd'].map((id) =>
      service.resolve(LivePlatform.KICK, { ...youtube, id }),
    );
    await expect(service.resolve(LivePlatform.KICK, { ...youtube, id: 'e' })).resolves.toBeNull();
    expect(runBoundedProcess).toHaveBeenCalledTimes(4);
    release();
    await Promise.all(pending);
    await service.resolve(LivePlatform.KICK, { ...youtube, id: 'f' });
    expect(runBoundedProcess).toHaveBeenCalledTimes(5);
  });
});
