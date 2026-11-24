import { LiveChunkOutcome } from '../../../../common/enums/live-chunk-outcome.enum';
import { LiveMode, LiveRunStatus, LiveSourceKind } from '../../../../generated/prisma';
import { LeaseLostError } from '../../errors/processing.errors';
import { RunWorker } from '../run-worker';

const context = {
  lease: { runId: 'run-1', generation: 3 },
  streamId: 'st1',
  mode: LiveMode.AUDIO,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date(),
};

describe('RunWorker', () => {
  const deps = {
    writer: { renew: vi.fn() },
    lifecycle: { activate: vi.fn(), setStatus: vi.fn(), finish: vi.fn() },
    transcripts: { handleChunk: vi.fn() },
    summaries: {
      shouldSummarize: vi.fn(() => false),
      summarize: vi.fn(),
      summarizeFinal: vi.fn(),
      maybeSnapshot: vi.fn(),
    },
    translations: {
      enqueueCaption: vi.fn(),
      flushCaptions: vi.fn(),
      translateCard: vi.fn(),
      dropRun: vi.fn(),
    },
    vision: { maybeSample: vi.fn() },
  };
  const source = { poll: vi.fn(), dispose: vi.fn() };
  const worker = (): RunWorker => new RunWorker(deps as never, context, source as never);
  const chunk = { wav: Buffer.alloc(1), startAt: 0, endAt: 6000 };

  beforeEach(() => {
    vi.resetAllMocks();
    deps.summaries.shouldSummarize.mockReturnValue(false);
    deps.writer.renew.mockResolvedValue(LiveRunStatus.ACTIVE);
    source.poll.mockResolvedValue({ chunks: [], ended: false, latestSegmentFile: null });
  });

  it('STOPPING (last viewer gone) → STOPPED with NO_VIEWERS, then cleans up', async () => {
    deps.writer.renew.mockResolvedValueOnce(LiveRunStatus.STOPPING);
    await worker().run();
    expect(deps.lifecycle.activate).toHaveBeenCalledWith(context);
    expect(deps.lifecycle.finish).toHaveBeenCalledWith(
      context,
      LiveRunStatus.STOPPED,
      'NO_VIEWERS',
      0,
    );
    expect(source.poll).not.toHaveBeenCalled();
    expect(source.dispose).toHaveBeenCalled();
    expect(deps.translations.dropRun).toHaveBeenCalledWith('run-1');
  });

  it('transcribes each chunk, queues captions and runs background steps', async () => {
    const line = { id: 's', seq: 0, startAt: 0, endAt: 6000, text: 'hi', language: 'en' };
    source.poll.mockResolvedValueOnce({
      chunks: [chunk, chunk],
      ended: false,
      latestSegmentFile: '/tmp/x',
    });
    deps.transcripts.handleChunk
      .mockResolvedValueOnce({ outcome: LiveChunkOutcome.TEXT, line })
      .mockResolvedValueOnce({ outcome: LiveChunkOutcome.SILENCE, line: null });
    deps.summaries.shouldSummarize.mockReturnValueOnce(true);
    deps.summaries.summarize.mockResolvedValueOnce([{ target: { id: 'c' }, type: 'card' }]);
    const runner = worker();
    await expect(runner.iterate()).resolves.toBe(false);
    await new Promise((resolve) => setImmediate(resolve));
    expect(deps.transcripts.handleChunk).toHaveBeenCalledTimes(2);
    expect(deps.translations.enqueueCaption).toHaveBeenCalledWith('run-1', line);
    expect(deps.translations.translateCard).toHaveBeenCalledWith(context, { id: 'c' }, 'card');
    expect(deps.vision.maybeSample).toHaveBeenCalledWith(context, expect.anything(), '/tmp/x');
    expect(deps.summaries.maybeSnapshot).toHaveBeenCalled();
  });

  it('source end → final summary, ENDED with SOURCE_ENDED', async () => {
    source.poll.mockResolvedValueOnce({ chunks: [], ended: true, latestSegmentFile: null });
    await worker().run();
    expect(deps.translations.flushCaptions).toHaveBeenCalledWith(context, true);
    expect(deps.summaries.summarizeFinal).toHaveBeenCalledWith(context, expect.anything());
    expect(deps.lifecycle.finish).toHaveBeenCalledWith(
      context,
      LiveRunStatus.ENDED,
      'SOURCE_ENDED',
      0,
    );
  });

  it('a lost lease exits silently without touching the run', async () => {
    deps.writer.renew.mockRejectedValueOnce(new LeaseLostError());
    await worker().run();
    expect(deps.lifecycle.finish).not.toHaveBeenCalled();
    expect(source.dispose).toHaveBeenCalled();
  });

  it('any other error fails the run (FAILED)', async () => {
    deps.lifecycle.activate.mockRejectedValueOnce(new Error('boom'));
    await worker().run();
    expect(deps.lifecycle.finish).toHaveBeenCalledWith(context, LiveRunStatus.FAILED, 'FAILED', 0);
  });

  it('goes DELAYED after 20 s without a processed chunk and back to ACTIVE on the next one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const runner = worker();
      vi.setSystemTime(Date.now() + 21_000);
      await runner.iterate();
      expect(deps.lifecycle.setStatus).toHaveBeenCalledWith(
        context,
        LiveRunStatus.DELAYED,
        'DELAYED',
      );
      deps.writer.renew.mockResolvedValueOnce(LiveRunStatus.DELAYED);
      source.poll.mockResolvedValueOnce({ chunks: [chunk], ended: false, latestSegmentFile: null });
      deps.transcripts.handleChunk.mockResolvedValueOnce({
        outcome: LiveChunkOutcome.SILENCE,
        line: null,
      });
      await runner.iterate();
      expect(deps.lifecycle.setStatus).toHaveBeenLastCalledWith(
        context,
        LiveRunStatus.ACTIVE,
        'ANALYZING',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('tolerates transient poll failures but fails after the limit', async () => {
    source.poll.mockRejectedValue(new Error('UPSTREAM'));
    const runner = worker();
    for (let attempt = 0; attempt < 29; attempt += 1)
      await expect(runner.iterate()).resolves.toBe(false);
    await expect(runner.iterate()).rejects.toThrow('LIVE_SOURCE_UNREACHABLE');
  });

  it('stop() ends the loop at the next boundary', async () => {
    const runner = worker();
    runner.stop();
    await runner.run();
    expect(deps.writer.renew).not.toHaveBeenCalled();
    expect(runner.runId).toBe('run-1');
  });
});
