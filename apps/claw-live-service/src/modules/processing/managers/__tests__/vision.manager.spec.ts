const { runBoundedProcess } = vi.hoisted(() => ({ runBoundedProcess: vi.fn() }));
vi.mock('../../../../common/utilities/process.utility', () => ({ runBoundedProcess }));

import { LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { createRunMemory } from '../../utilities/run-memory.utility';
import { VisionManager } from '../vision.manager';

const context = (mode: LiveMode) => ({
  lease: { runId: 'run-1', generation: 1 },
  streamId: 'st1',
  mode,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date(),
});

const thumb = (value: number) => ({
  exitCode: 0,
  stdout: Buffer.alloc(256, value),
  stderrTail: '',
});
const jpeg = { exitCode: 0, stdout: Buffer.from([0xff, 0xd8, 0xff]), stderrTail: '' };

describe('VisionManager', () => {
  const tx = { liveProviderCost: { upsert: vi.fn() }, liveFeedEvent: { upsert: vi.fn() } };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const model = { complete: vi.fn() };
  const policy = {
    active: vi.fn().mockResolvedValue({
      version: 1,
      config: {
        visionModelChain: [{ connector: 'GEMINI', model: 'flash', style: 'OPENAI_COMPAT' }],
      },
    }),
  };
  const events = { emit: vi.fn() };
  const manager = new VisionManager(
    writer as never,
    model as never,
    policy as never,
    events as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tx.liveFeedEvent.upsert.mockResolvedValue({
      id: 'v1',
      eventKey: 'visual:1',
      kind: 'VISUAL',
      version: 1,
    });
  });

  it('does nothing in AUDIO mode or without a segment', async () => {
    await manager.maybeSample(context(LiveMode.AUDIO), createRunMemory(0), '/tmp/s.bin', 100_000);
    await manager.maybeSample(context(LiveMode.AUDIO_VISION), createRunMemory(0), null, 100_000);
    expect(runBoundedProcess).not.toHaveBeenCalled();
  });

  it('samples a first frame, sends it as base64 JPEG and stores a VISUAL note', async () => {
    runBoundedProcess.mockResolvedValueOnce(thumb(10)).mockResolvedValueOnce(jpeg);
    model.complete.mockResolvedValueOnce({
      content: '{"visible":true,"description":"A dashboard with request volume."}',
      connector: 'GEMINI',
      model: 'flash',
      latencyMs: 9,
    });
    const memory = createRunMemory(0);
    memory.lastMediaAt = 77_000;
    await manager.maybeSample(context(LiveMode.AUDIO_VISION), memory, '/tmp/s.bin', 100_000);
    const args = runBoundedProcess.mock.calls[0]?.[1] as string[];
    expect(args).toEqual(expect.arrayContaining(['-protocol_whitelist', 'file', '-frames:v', '1']));
    expect(model.complete.mock.calls[0]?.[1].imageJpegBase64).toBe(jpeg.stdout.toString('base64'));
    expect(tx.liveFeedEvent.upsert.mock.calls[0]?.[0].create).toMatchObject({
      kind: 'VISUAL',
      eventKey: 'visual:77000',
      startAt: 77_000n,
    });
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create.stage).toBe('VISION');
    expect(memory.visualNotes).toEqual([
      { at: 77_000, description: 'A dashboard with request volume.' },
    ]);
    expect(events.emit).toHaveBeenCalled();
  });

  it('samples at most every 10 s and skips an unchanged scene until 60 s passed', async () => {
    const memory = createRunMemory(0);
    memory.vision = {
      lastSampleWallAt: 100_000,
      lastKeptWallAt: 100_000,
      lastThumb: Buffer.alloc(256, 10),
    };
    await manager.maybeSample(context(LiveMode.AUDIO_VISION), memory, '/tmp/s.bin', 105_000);
    expect(runBoundedProcess).not.toHaveBeenCalled();
    runBoundedProcess.mockResolvedValueOnce(thumb(12));
    await manager.maybeSample(context(LiveMode.AUDIO_VISION), memory, '/tmp/s.bin', 111_000);
    expect(runBoundedProcess).toHaveBeenCalledTimes(1);
    expect(model.complete).not.toHaveBeenCalled();
  });

  it('decides keeps per mode', () => {
    const memory = createRunMemory(0);
    memory.vision.lastKeptWallAt = 100_000;
    expect(manager.shouldKeep(LiveMode.AUDIO_VISION, memory, true, 101_000)).toBe(true);
    expect(manager.shouldKeep(LiveMode.AUDIO_VISION, memory, false, 130_000)).toBe(false);
    expect(manager.shouldKeep(LiveMode.AUDIO_VISION, memory, false, 160_000)).toBe(true);
    memory.lastSpeechEndAt = 50_000;
    memory.lastMediaAt = 60_000;
    expect(manager.shouldKeep(LiveMode.SMART_AUTO, memory, false, 200_000)).toBe(false);
    expect(manager.shouldKeep(LiveMode.SMART_AUTO, memory, true, 101_000)).toBe(true);
    memory.lastMediaAt = 90_000;
    expect(manager.shouldKeep(LiveMode.SMART_AUTO, memory, false, 200_000)).toBe(true);
  });

  it('stores nothing for an invisible frame, a link-bearing answer or no video', async () => {
    runBoundedProcess.mockResolvedValueOnce(thumb(10)).mockResolvedValueOnce(jpeg);
    model.complete.mockResolvedValueOnce({
      content: '{"visible":false,"description":""}',
      connector: 'G',
      model: 'f',
      latencyMs: 1,
    });
    await manager.maybeSample(
      context(LiveMode.AUDIO_VISION),
      createRunMemory(0),
      '/tmp/s.bin',
      100_000,
    );
    runBoundedProcess.mockResolvedValueOnce(thumb(10)).mockResolvedValueOnce(jpeg);
    model.complete.mockResolvedValueOnce({
      content: '{"visible":true,"description":"Visit https://evil.example"}',
      connector: 'G',
      model: 'f',
      latencyMs: 1,
    });
    await manager.maybeSample(
      context(LiveMode.AUDIO_VISION),
      createRunMemory(0),
      '/tmp/s.bin',
      100_000,
    );
    runBoundedProcess.mockResolvedValueOnce({
      exitCode: 1,
      stdout: Buffer.alloc(0),
      stderrTail: '',
    });
    await manager.maybeSample(
      context(LiveMode.AUDIO_VISION),
      createRunMemory(0),
      '/tmp/s.bin',
      100_000,
    );
    expect(tx.liveFeedEvent.upsert).not.toHaveBeenCalled();
    expect(tx.liveProviderCost.upsert).toHaveBeenCalledTimes(2);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
