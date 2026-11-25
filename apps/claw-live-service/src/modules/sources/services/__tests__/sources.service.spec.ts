import { LiveCapability, LivePlatform, LiveSourceKind } from '../../../../generated/prisma';
import { SourcesService } from '../sources.service';

describe('SourcesService', () => {
  const guard = { assertSafe: vi.fn().mockResolvedValue(['93.184.216.34']) };
  const fixtures = { isFixtureName: vi.fn((name: string) => name === 'live-demo') };
  const prisma = { liveStream: { upsert: vi.fn().mockResolvedValue({ id: 'stream-1' }) } };
  const serverPull = { supports: vi.fn().mockReturnValue(false), probe: vi.fn() };
  const policy = { active: vi.fn().mockResolvedValue({ config: { serverPullPlatforms: [] } }) };
  const recordedVideos = { probe: vi.fn().mockResolvedValue(null) };
  const shareLinks = { follow: vi.fn(async (resolution: unknown) => resolution) };
  const service = new SourcesService(
    prisma as never,
    guard as never,
    fixtures as never,
    serverPull as never,
    policy as never,
    recordedVideos as never,
    shareLinks as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    serverPull.supports.mockReturnValue(false);
    policy.active.mockResolvedValue({ config: { serverPullPlatforms: [] } });
    recordedVideos.probe.mockResolvedValue(null);
  });

  it('resolves YouTube as BROWSER_CAPTURE with the same nocookie embed, its chat, and no network call', async () => {
    const result = await service.resolve('https://youtu.be/dQw4w9WgXcQ', 'u1');
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.BROWSER_CAPTURE,
      reasonCode: 'BROWSER_CAPTURE_AVAILABLE',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
      accessScope: 'PRIVATE:u1',
      platform: LivePlatform.YOUTUBE,
      chatEmbedUrl: 'https://www.youtube.com/live_chat?v=dQw4w9WgXcQ',
      watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      normalizedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      declaredHost: 'www.youtube.com',
      embedNeedsParent: false,
      chatNeedsEmbedDomain: true,
    });
    const watch = await service.resolve('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'u2');
    expect(watch.sourceIdentity).toBe(result.sourceIdentity);
    expect(guard.assertSafe).not.toHaveBeenCalled();
  });

  it('resolves a /channel/UC… link to the channel live embed, capture, no chat', async () => {
    const result = await service.resolve(
      'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
      'u1',
    );
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.BROWSER_CAPTURE,
      reasonCode: 'BROWSER_CAPTURE_AVAILABLE',
      embedUrl:
        'https://www.youtube-nocookie.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&playsinline=1',
      normalizedUrl: 'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
      watchUrl: 'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
      chatEmbedUrl: null,
      chatNeedsEmbedDomain: false,
    });
    expect(guard.assertSafe).not.toHaveBeenCalled();
  });

  it('refuses a YouTube @handle link with its own code', async () => {
    await expect(
      service.resolve('https://www.youtube.com/@aljazeeraenglish/live', 'u1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'LIVE_YOUTUBE_HANDLE_UNSUPPORTED' }),
    });
  });

  it('resolves Twitch to its player and chat, both needing the parent domain', async () => {
    const result = await service.resolve('https://www.twitch.tv/Shroud', 'u3');
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.PLATFORM,
      capability: LiveCapability.BROWSER_CAPTURE,
      platform: LivePlatform.TWITCH,
      accessScope: 'PRIVATE:u3',
      embedUrl: 'https://player.twitch.tv/?channel=shroud&autoplay=true',
      chatEmbedUrl: 'https://www.twitch.tv/embed/shroud/chat?darkpopout',
      watchUrl: 'https://www.twitch.tv/shroud',
      embedNeedsParent: true,
      chatNeedsEmbedDomain: false,
    });
    const again = await service.resolve('https://m.twitch.tv/shroud', 'u4');
    expect(again.sourceIdentity).toBe(result.sourceIdentity);
  });

  it('resolves a LINK_ONLY platform as PUBLIC with no player and no chat', async () => {
    const result = await service.resolve('https://www.tiktok.com/@someone/live', 'u1');
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.PLATFORM,
      capability: LiveCapability.LINK_ONLY,
      platform: LivePlatform.TIKTOK,
      reasonCode: 'LINK_ONLY_PLATFORM',
      accessScope: 'PUBLIC',
      embedUrl: null,
      chatEmbedUrl: null,
      watchUrl: 'https://www.tiktok.com/@someone/live',
    });
  });

  it.each(['https://discord.com/channels/1/2', 'https://discord.gg/abcdef'])(
    'refuses Discord %s with LIVE_DISCORD_PRIVATE',
    async (url) => {
      await expect(service.resolve(url, 'u1')).rejects.toMatchObject({
        status: 422,
        response: expect.objectContaining({ message: 'LIVE_DISCORD_PRIVATE' }),
      });
    },
  );

  it('resolves a public HLS URL with an identity independent of host case and fragment', async () => {
    const a = await service.resolve('https://CDN.example.com/live/index.m3u8#frag', 'u1');
    const b = await service.resolve('https://cdn.example.com/live/index.m3u8', 'u2');
    expect(a).toMatchObject({
      sourceKind: LiveSourceKind.HLS,
      capability: LiveCapability.AUDIO_VISION,
      accessScope: 'PUBLIC',
      declaredHost: 'cdn.example.com',
      embedUrl: null,
      platform: null,
      watchUrl: '',
    });
    expect(a.sourceIdentity).toBe(b.sourceIdentity);
    expect(guard.assertSafe).toHaveBeenCalledTimes(2);
  });

  it('scopes an HLS URL with a query string to the user', async () => {
    const result = await service.resolve('https://cdn.example.com/live.m3u8?token=abc', 'u9');
    expect(result.accessScope).toBe('PRIVATE:u9');
  });

  it('propagates the SSRF guard refusal', async () => {
    guard.assertSafe.mockRejectedValueOnce(new Error('LIVE_SOURCE_UNSAFE'));
    await expect(service.resolve('https://10.0.0.1/a.m3u8', 'u1')).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
  });

  it('resolves only allowlisted fixtures', async () => {
    await expect(service.resolve('fixture:live-demo', 'u1')).resolves.toMatchObject({
      sourceKind: LiveSourceKind.FIXTURE,
      normalizedUrl: 'fixture:live-demo',
      accessScope: 'PUBLIC',
    });
    await expect(service.resolve('fixture:../../etc/passwd', 'u1')).rejects.toThrow(
      'LIVE_SOURCE_UNSUPPORTED',
    );
  });

  it.each(['not a url', 'https://example.com/video.mp4', 'file:///etc/passwd.m3u8x'])(
    'refuses %s as unsupported',
    async (url) => {
      await expect(service.resolve(url, 'u1')).rejects.toThrow('LIVE_SOURCE_UNSUPPORTED');
    },
  );

  it('stores the platform on the stream row', async () => {
    const resolution = await service.resolve('https://kick.com/xqc', 'u1');
    await service.upsertStream(resolution);
    expect(prisma.liveStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ platform: LivePlatform.KICK }),
        update: expect.objectContaining({ platform: LivePlatform.KICK }),
      }),
    );
  });

  it('upserts the stream on (sourceIdentity, accessScope)', async () => {
    const resolution = await service.resolve('https://cdn.example.com/a.m3u8', 'u1');
    await service.upsertStream(resolution);
    expect(prisma.liveStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceIdentity_accessScope: {
            sourceIdentity: resolution.sourceIdentity,
            accessScope: 'PUBLIC',
          },
        },
      }),
    );
  });

  describe('server pull', () => {
    const enable = (live: boolean, videoId: string | null = null): void => {
      serverPull.supports.mockImplementation((platform: string) => platform !== 'DISCORD');
      serverPull.probe.mockResolvedValue(
        live
          ? { playlist: new URL('https://cdn.example.com/p.m3u8'), hostSuffixes: [], videoId }
          : null,
      );
      policy.active.mockResolvedValue({
        config: { serverPullPlatforms: ['TWITCH', 'YOUTUBE', 'KICK', 'TIKTOK'] },
      });
    };

    it('resolves a live Twitch channel as SERVER_PULL, PUBLIC so every viewer shares one run', async () => {
      enable(true);
      const result = await service.resolve('https://www.twitch.tv/xqc', 'u1');
      expect(result).toMatchObject({
        capability: LiveCapability.SERVER_PULL,
        accessScope: 'PUBLIC',
        reasonCode: 'SERVER_PULL_AVAILABLE',
        platform: LivePlatform.TWITCH,
        watchUrl: 'https://www.twitch.tv/xqc',
        embedNeedsParent: true,
      });
      expect(serverPull.probe).toHaveBeenCalledWith(
        LivePlatform.TWITCH,
        expect.objectContaining({ id: 'xqc', watchUrl: 'https://www.twitch.tv/xqc' }),
      );
    });

    it('falls back to private BROWSER_CAPTURE with SERVER_PULL_UNAVAILABLE when the stream cannot be read', async () => {
      enable(false);
      const result = await service.resolve('https://www.twitch.tv/offline_channel', 'u1');
      expect(result).toMatchObject({
        capability: LiveCapability.BROWSER_CAPTURE,
        accessScope: 'PRIVATE:u1',
        reasonCode: 'SERVER_PULL_UNAVAILABLE',
      });
    });

    it('makes no network call when the policy turns server pull off (the default-off rollback lever)', async () => {
      serverPull.supports.mockImplementation((platform: string) => platform === 'TWITCH');
      const result = await service.resolve('https://www.twitch.tv/xqc', 'u1');
      expect(result).toMatchObject({
        capability: LiveCapability.BROWSER_CAPTURE,
        reasonCode: 'BROWSER_CAPTURE_AVAILABLE',
      });
      expect(serverPull.probe).not.toHaveBeenCalled();
    });

    it('pulls YouTube, Kick and a link-only platform (TikTok) on the server when live', async () => {
      enable(true);
      const youtube = await service.resolve('https://youtu.be/dQw4w9WgXcQ', 'u1');
      const kick = await service.resolve('https://kick.com/xqc', 'u1');
      const tiktok = await service.resolve('https://www.tiktok.com/@someone/live', 'u1');
      for (const result of [youtube, kick, tiktok]) {
        expect(result).toMatchObject({
          capability: LiveCapability.SERVER_PULL,
          accessScope: 'PUBLIC',
          reasonCode: 'SERVER_PULL_AVAILABLE',
        });
      }
      expect(tiktok.embedUrl).toBeNull();
    });

    it('gives a live YouTube channel link the live chat of the video the server found', async () => {
      enable(true, 'FelGGahCbS8');
      const result = await service.resolve(
        'https://www.youtube.com/channel/UCfiwzLy-8yKzIbsmZTzxDgw/live',
        'u1',
      );
      expect(result).toMatchObject({
        capability: LiveCapability.SERVER_PULL,
        chatEmbedUrl: 'https://www.youtube.com/live_chat?v=FelGGahCbS8',
        chatNeedsEmbedDomain: true,
      });
    });

    it('keeps an offline link-only platform link-only, and never probes Discord', async () => {
      enable(false);
      const tiktok = await service.resolve('https://www.tiktok.com/@someone/live', 'u1');
      expect(tiktok).toMatchObject({
        capability: LiveCapability.LINK_ONLY,
        reasonCode: 'LINK_ONLY_PLATFORM',
      });
      serverPull.probe.mockClear();
      await expect(service.resolve('https://discord.com/channels/1/2', 'u1')).rejects.toBeDefined();
      expect(serverPull.probe).not.toHaveBeenCalled();
    });

    it('does not pull a platform the policy leaves out', async () => {
      enable(true);
      const facebook = await service.resolve(
        'https://www.facebook.com/NASA/videos/123456789012',
        'u1',
      );
      expect(facebook.capability).toBe(LiveCapability.BROWSER_CAPTURE);
    });
  });
  describe('recorded videos (ADR-221 batch 6)', () => {
    const recorded = (durationSeconds: number | null, maxSeconds = 10_800) => {
      serverPull.supports.mockReturnValue(true);
      serverPull.probe.mockResolvedValue(null);
      recordedVideos.probe.mockResolvedValue({ durationSeconds, videoId: 'v1' });
      policy.active.mockResolvedValue({
        config: {
          serverPullPlatforms: ['FACEBOOK', 'TIKTOK', 'DAILYMOTION'],
          recordedVideoMaxSeconds: maxSeconds,
        },
      });
    };

    it('resolves a Facebook share link to a recorded video as RECORDED, private, with no chat', async () => {
      recorded(95);
      const result = await service.resolve('https://www.facebook.com/share/v/1DpSNW9BD1/', 'u1');
      expect(result).toMatchObject({
        capability: LiveCapability.RECORDED,
        accessScope: 'PRIVATE:u1',
        reasonCode: 'RECORDED_VIDEO',
        platform: LivePlatform.FACEBOOK,
        watchUrl: 'https://www.facebook.com/share/v/1DpSNW9BD1/',
        chatEmbedUrl: null,
      });
      expect(recordedVideos.probe).toHaveBeenCalledWith(
        'https://www.facebook.com/share/v/1DpSNW9BD1/',
      );
    });

    it('accepts a video whose length the site hides (Instagram) and a new host platform', async () => {
      recorded(null);
      await expect(
        service.resolve('https://vt.tiktok.com/ZSsYongoV/', 'u1'),
      ).resolves.toMatchObject({
        capability: LiveCapability.RECORDED,
        platform: LivePlatform.TIKTOK,
      });
      await expect(
        service.resolve('https://www.dailymotion.com/video/x9abcd', 'u1'),
      ).resolves.toMatchObject({
        capability: LiveCapability.RECORDED,
        platform: LivePlatform.DAILYMOTION,
        embedUrl: 'https://www.dailymotion.com/embed/video/x9abcd',
      });
    });

    it('frames a vertical video 9:16: the reported frame size wins, else the link shape', async () => {
      recorded(60);
      recordedVideos.probe.mockResolvedValue({ durationSeconds: 60, videoId: 'v', portrait: true });
      await expect(
        service.resolve('https://www.dailymotion.com/video/x9abcd', 'u1'),
      ).resolves.toMatchObject({ portrait: true });
      recordedVideos.probe.mockResolvedValue({ durationSeconds: 60, videoId: 'v', portrait: null });
      await expect(
        service.resolve('https://www.facebook.com/reel/4620908104798158', 'u1'),
      ).resolves.toMatchObject({ portrait: true });
      recordedVideos.probe.mockResolvedValue({
        durationSeconds: 60,
        videoId: 'v',
        portrait: false,
      });
      await expect(
        service.resolve('https://www.facebook.com/reel/4620908104798158', 'u1'),
      ).resolves.toMatchObject({ portrait: false });
    });

    it('refuses a video longer than the policy allows with LIVE_RECORDED_TOO_LONG', async () => {
      recorded(10_801);
      await expect(
        service.resolve('https://www.facebook.com/reel/4620908104798158', 'u1'),
      ).rejects.toThrow('LIVE_RECORDED_TOO_LONG');
    });

    it('never probes for a recorded video when the policy turns them off (0)', async () => {
      recorded(60, 0);
      const result = await service.resolve('https://www.facebook.com/reel/4620908104798158', 'u1');
      expect(result.capability).toBe(LiveCapability.BROWSER_CAPTURE);
      expect(recordedVideos.probe).not.toHaveBeenCalled();
    });

    it('keeps a live stream on shared SERVER_PULL without asking about recorded videos', async () => {
      recorded(60);
      serverPull.probe.mockResolvedValue({
        playlist: new URL('https://cdn.example.com/p.m3u8'),
        hostSuffixes: [],
        videoId: null,
      });
      const result = await service.resolve(
        'https://www.facebook.com/watch/live/?v=1234567890',
        'u1',
      );
      expect(result).toMatchObject({
        capability: LiveCapability.SERVER_PULL,
        accessScope: 'PUBLIC',
      });
      expect(recordedVideos.probe).not.toHaveBeenCalled();
    });
  });
});
