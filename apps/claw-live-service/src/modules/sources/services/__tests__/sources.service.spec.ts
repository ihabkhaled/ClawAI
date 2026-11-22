import { LiveCapability, LivePlatform, LiveSourceKind } from '../../../../generated/prisma';
import { SourcesService } from '../sources.service';

describe('SourcesService', () => {
  const guard = { assertSafe: vi.fn().mockResolvedValue(['93.184.216.34']) };
  const fixtures = { isFixtureName: vi.fn((name: string) => name === 'live-demo') };
  const prisma = { liveStream: { upsert: vi.fn().mockResolvedValue({ id: 'stream-1' }) } };
  const service = new SourcesService(prisma as never, guard as never, fixtures as never);

  beforeEach(() => vi.clearAllMocks());

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
});
