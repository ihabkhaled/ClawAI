import { LiveCapability, LiveSourceKind } from '../../../../generated/prisma';
import { SourcesService } from '../sources.service';

describe('SourcesService', () => {
  const guard = { assertSafe: vi.fn().mockResolvedValue(['93.184.216.34']) };
  const fixtures = { isFixtureName: vi.fn((name: string) => name === 'live-demo') };
  const prisma = { liveStream: { upsert: vi.fn().mockResolvedValue({ id: 'stream-1' }) } };
  const service = new SourcesService(prisma as never, guard as never, fixtures as never);

  beforeEach(() => vi.clearAllMocks());

  it('resolves YouTube as PLAYER_ONLY with a nocookie embed and never touches the network', async () => {
    const result = await service.resolve('https://youtu.be/dQw4w9WgXcQ', 'u1');
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.PLAYER_ONLY,
      reasonCode: 'YOUTUBE_ANALYSIS_NOT_PERMITTED',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1',
      accessScope: 'PUBLIC',
    });
    const watch = await service.resolve('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'u2');
    expect(watch.sourceIdentity).toBe(result.sourceIdentity);
    expect(guard.assertSafe).not.toHaveBeenCalled();
  });

  it('resolves a /channel/UC… link to the channel live embed, player only', async () => {
    const result = await service.resolve(
      'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
      'u1',
    );
    expect(result).toMatchObject({
      sourceKind: LiveSourceKind.YOUTUBE,
      capability: LiveCapability.PLAYER_ONLY,
      reasonCode: 'YOUTUBE_ANALYSIS_NOT_PERMITTED',
      embedUrl:
        'https://www.youtube-nocookie.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&playsinline=1',
      normalizedUrl: 'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
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

  it('resolves a public HLS URL with an identity independent of host case and fragment', async () => {
    const a = await service.resolve('https://CDN.example.com/live/index.m3u8#frag', 'u1');
    const b = await service.resolve('https://cdn.example.com/live/index.m3u8', 'u2');
    expect(a).toMatchObject({
      sourceKind: LiveSourceKind.HLS,
      capability: LiveCapability.AUDIO_VISION,
      accessScope: 'PUBLIC',
      declaredHost: 'cdn.example.com',
      embedUrl: null,
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
