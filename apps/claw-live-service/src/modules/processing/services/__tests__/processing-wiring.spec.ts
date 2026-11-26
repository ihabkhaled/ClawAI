import {
  LiveCapability,
  LiveMode,
  LivePlatform,
  LiveRunStatus,
  LiveSourceKind,
} from '../../../../generated/prisma';
import { ProcessingRunRepository } from '../../repositories/processing-run.repository';
import { RunWorker } from '../../workers/run-worker';
import { RunEventEmitter } from '../run-event-emitter.service';
import { RunWorkerFactory } from '../run-worker-factory.service';

describe('RunEventEmitter', () => {
  it('publishes each event and swallows a fan-out failure', async () => {
    const publisher = {
      publish: vi.fn().mockRejectedValueOnce(new Error('redis')).mockResolvedValueOnce(undefined),
    };
    const emitter = new RunEventEmitter(publisher as never);
    const event = { type: 'caption', runId: 'r', startAt: 1, data: {} } as never;
    await expect(emitter.emit([event, event])).resolves.toBeUndefined();
    expect(publisher.publish).toHaveBeenCalledTimes(2);
  });
});

describe('RunWorkerFactory', () => {
  it('builds a worker with the claimed generation, and none for a no-run source or a vanished run', async () => {
    const runs = { findRunWithStream: vi.fn() };
    const factory = new RunWorkerFactory(
      runs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    runs.findRunWithStream.mockResolvedValueOnce({
      id: 'run-1',
      streamId: 'st1',
      mode: LiveMode.AUDIO,
      startedAt: new Date(),
      stream: {
        sourceKind: LiveSourceKind.FIXTURE,
        sourceUrl: 'fixture:live-demo',
        declaredHost: null,
      },
    });
    const worker = await factory.create({ id: 'run-1', generation: 9 });
    expect(worker).toBeInstanceOf(RunWorker);
    expect(worker?.runId).toBe('run-1');
    runs.findRunWithStream.mockResolvedValueOnce({
      id: 'y',
      stream: { sourceKind: LiveSourceKind.YOUTUBE, capability: LiveCapability.PLAYER_ONLY },
    });
    await expect(factory.create({ id: 'y', generation: 1 })).resolves.toBeNull();
    runs.findRunWithStream.mockResolvedValueOnce({
      id: 'k',
      stream: { sourceKind: LiveSourceKind.PLATFORM, capability: LiveCapability.LINK_ONLY },
    });
    await expect(factory.create({ id: 'k', generation: 1 })).resolves.toBeNull();
    runs.findRunWithStream.mockResolvedValueOnce(null);
    await expect(factory.create({ id: 'z', generation: 1 })).resolves.toBeNull();
  });

  it('builds a capture worker for a BROWSER_CAPTURE run that pops the run queue, never HLS', async () => {
    const runs = { findRunWithStream: vi.fn() };
    const redis = { lpopBuffer: vi.fn().mockResolvedValue(null) };
    const fetcher = { fetchObject: vi.fn() };
    const factory = new RunWorkerFactory(
      runs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      fetcher as never,
      {} as never,
      {} as never,
      {} as never,
      redis as never,
    );
    runs.findRunWithStream.mockResolvedValueOnce({
      id: 'run-c',
      streamId: 'st-c',
      mode: LiveMode.AUDIO,
      startedAt: new Date(),
      stream: {
        sourceKind: LiveSourceKind.YOUTUBE,
        capability: LiveCapability.BROWSER_CAPTURE,
        sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        declaredHost: 'www.youtube.com',
      },
    });
    const worker = await factory.create({ id: 'run-c', generation: 2 });
    expect(worker).toBeInstanceOf(RunWorker);
    const source = (worker as unknown as { source: { poll: () => Promise<unknown> } }).source;
    await expect(source.poll()).resolves.toEqual({
      chunks: [],
      ended: false,
      latestSegmentFile: null,
    });
    expect(redis.lpopBuffer).toHaveBeenCalledWith('live:capture:run-c', 20);
    expect(fetcher.fetchObject).not.toHaveBeenCalled();
  });

  it('builds a SERVER_PULL worker that resolves the Twitch playlist and fetches on the CDN suffixes', async () => {
    const runs = { findRunWithStream: vi.fn() };
    const master =
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=160000\naudio.m3u8\n' +
      '#EXT-X-STREAM-INF:BANDWIDTH=230000,RESOLUTION=284x160\nlow.m3u8\n';
    const fetcher = {
      fetchObject: vi
        .fn()
        .mockResolvedValueOnce({ body: Buffer.from(master) })
        .mockResolvedValueOnce({ body: Buffer.from('#EXTM3U\n#EXT-X-TARGETDURATION:6\n') }),
    };
    const playlist = new URL('https://usher.ttvnw.net/api/channel/hls/xqc.m3u8?sig=s&token=t');
    const serverPull = {
      supports: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockResolvedValue({
        playlist,
        hostSuffixes: ['ttvnw.net', 'live-video.net'],
        headers: {},
      }),
    };
    const factory = new RunWorkerFactory(
      runs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      fetcher as never,
      {} as never,
      serverPull as never,
      {} as never,
      {} as never,
    );
    runs.findRunWithStream.mockResolvedValueOnce({
      id: 'run-p',
      streamId: 'st-p',
      mode: LiveMode.AUDIO,
      startedAt: new Date(),
      stream: {
        sourceKind: LiveSourceKind.PLATFORM,
        capability: LiveCapability.SERVER_PULL,
        platform: LivePlatform.TWITCH,
        sourceUrl: 'https://www.twitch.tv/xqc',
        declaredHost: 'www.twitch.tv',
      },
    });
    const worker = await factory.create({ id: 'run-p', generation: 1 });
    const source = (worker as unknown as { source: { poll: () => Promise<unknown> } }).source;
    await expect(source.poll()).resolves.toMatchObject({ chunks: [], ended: false });
    expect(serverPull.resolve).toHaveBeenCalledWith(
      LivePlatform.TWITCH,
      expect.objectContaining({ id: 'xqc', watchUrl: 'https://www.twitch.tv/xqc' }),
      false,
    );
    const pins = ['ttvnw.net', 'live-video.net'];
    expect(fetcher.fetchObject).toHaveBeenNthCalledWith(1, playlist, pins, expect.any(Number), {});
    // AUDIO mode reads the lightest rendition: the audio-only one.
    expect(fetcher.fetchObject).toHaveBeenNthCalledWith(
      2,
      new URL('https://usher.ttvnw.net/api/channel/hls/audio.m3u8'),
      pins,
      expect.any(Number),
      {},
    );
    await (worker as unknown as { source: { dispose: () => Promise<void> } }).source.dispose();
  });
});

describe('ProcessingRunRepository', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    liveStream: { findUnique: vi.fn() },
    liveProcessingRun: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn(),
    },
    liveViewerSession: { count: vi.fn() },
    liveProviderCost: { aggregate: vi.fn() },
  };
  const repository = new ProcessingRunRepository(prisma as never);

  it('claims with one atomic UPDATE … FOR UPDATE SKIP LOCKED that bumps the generation', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'run-1', generation: 4 }]);
    await expect(repository.claimNext('me')).resolves.toEqual({ id: 'run-1', generation: 4 });
    const [strings, owner, seconds] = prisma.$queryRaw.mock.calls[0] ?? [];
    const sql = (strings as string[]).join('?');
    expect(sql).toContain('SET generation = generation + 1');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('lease_expires_at IS NULL OR lease_expires_at < now()');
    expect(sql).toContain('RETURNING id, generation');
    expect(owner).toBe('me');
    expect(seconds).toBe(15);
    prisma.$queryRaw.mockResolvedValueOnce([]);
    await expect(repository.claimNext('me')).resolves.toBeNull();
  });

  it('marks STOPPING and frees the activeKey only for live runs', async () => {
    await expect(repository.markStopping('run-1')).resolves.toBe(1);
    expect(prisma.liveProcessingRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'run-1',
        status: { in: [LiveRunStatus.PENDING, LiveRunStatus.ACTIVE, LiveRunStatus.DELAYED] },
      },
      data: { status: LiveRunStatus.STOPPING, activeKey: null },
    });
  });

  it('counts attached viewers, running runs and today cost', async () => {
    prisma.liveViewerSession.count.mockResolvedValueOnce(2);
    await expect(repository.countAttachedViewers('run-1')).resolves.toBe(2);
    expect(prisma.liveViewerSession.count.mock.calls[0]?.[0].where.state.in).not.toContain(
      'DETACHED',
    );
    prisma.liveProcessingRun.count.mockResolvedValueOnce(3);
    await expect(repository.countRunningRuns()).resolves.toBe(3);
    prisma.liveProviderCost.aggregate
      .mockResolvedValueOnce({ _sum: { costMicroUsd: 42n } })
      .mockResolvedValueOnce({ _sum: { costMicroUsd: null } });
    await expect(repository.providerCostSince(new Date())).resolves.toBe(42);
    await expect(repository.providerCostSince(new Date())).resolves.toBe(0);
    await repository.releaseLeases('me');
    expect(prisma.liveProcessingRun.updateMany).toHaveBeenLastCalledWith({
      where: { leaseOwner: 'me' },
      data: { leaseExpiresAt: new Date(0) },
    });
  });
});
