import { LiveMode, LiveRunStatus, LiveSourceKind } from '../../../../generated/prisma';
import { TranscriptManager } from '../../managers/transcript.manager';
import { encodeCaptureChunk } from '../../utilities/capture-chunk.utility';
import { pcmToWav } from '../../utilities/wav.utility';
import { CaptureChunkSource } from '../capture-chunk-source';
import { RunWorker } from '../run-worker';

const wav = pcmToWav(Buffer.alloc(6 * 32_000), 16_000, 1);

describe('CaptureChunkSource', () => {
  it('LPOPs up to 20 entries, decodes them in media order and never ends', async () => {
    const late = encodeCaptureChunk({ wav, startAt: 7000, endAt: 13_000 });
    const early = encodeCaptureChunk({ wav, startAt: 1000, endAt: 7000 });
    const redis = { lpopBuffer: vi.fn().mockResolvedValue([late, Buffer.alloc(3), early]) };
    const poll = await new CaptureChunkSource(redis as never, 'run1').poll();
    expect(redis.lpopBuffer).toHaveBeenCalledWith('live:capture:run1', 20);
    expect(poll.ended).toBe(false);
    expect(poll.latestSegmentFile).toBeNull();
    expect(poll.chunks.map((chunk) => chunk.startAt)).toEqual([1000, 7000]);
    expect(poll.chunks[0]?.wav.equals(wav)).toBe(true);
  });

  it('returns no chunks for an empty queue', async () => {
    const redis = { lpopBuffer: vi.fn().mockResolvedValue(null) };
    const source = new CaptureChunkSource(redis as never, 'run1');
    await expect(source.poll()).resolves.toEqual({
      chunks: [],
      ended: false,
      latestSegmentFile: null,
    });
    await expect(source.dispose()).resolves.toBeUndefined();
  });
});

describe('RunWorker in capture mode (LPOP → STT → transcript commit)', () => {
  it('commits a transcript segment and a CAPTION for a queued tab-audio chunk', async () => {
    const startAt = Date.now() - 7000;
    const redis = {
      lpopBuffer: vi
        .fn()
        .mockResolvedValue([encodeCaptureChunk({ wav, startAt, endAt: startAt + 6000 })]),
    };
    const stt = {
      transcribe: vi.fn().mockResolvedValue({
        text: 'hello from the tab',
        noSpeech: false,
        language: 'en',
        provider: 'stt',
        model: 'm',
        durationSeconds: 6,
        costMicroUsd: 10,
      }),
    };
    const tx = {
      liveProcessingRun: { update: vi.fn().mockResolvedValue({ nextSegmentSeq: 1 }) },
      liveTranscriptSegment: { create: vi.fn().mockResolvedValue({ id: 'seg1' }) },
      liveProviderCost: { upsert: vi.fn(), create: vi.fn() },
    };
    const writer = {
      renew: vi.fn().mockResolvedValue(LiveRunStatus.ACTIVE),
      commit: vi.fn(async (_lease: unknown, write: (client: unknown) => Promise<unknown>) =>
        write(tx),
      ),
    };
    const events = { emit: vi.fn() };
    const transcripts = new TranscriptManager(stt as never, writer as never, events as never);
    const context = {
      lease: { runId: 'run1', generation: 1 },
      streamId: 'st1',
      mode: LiveMode.AUDIO,
      sourceKind: LiveSourceKind.YOUTUBE,
      sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      declaredHost: 'www.youtube.com',
      startedAt: new Date(),
    };
    const deps = {
      writer,
      lifecycle: { activate: vi.fn(), setStatus: vi.fn(), finish: vi.fn() },
      transcripts,
      summaries: { shouldSummarize: vi.fn(() => false), maybeSnapshot: vi.fn() },
      translations: { enqueueCaption: vi.fn(), flushCaptions: vi.fn(), dropRun: vi.fn() },
      vision: { maybeSample: vi.fn() },
    };
    const worker = new RunWorker(
      deps as never,
      context,
      new CaptureChunkSource(redis as never, 'run1'),
    );
    await expect(worker.iterate()).resolves.toBe(false);
    expect(stt.transcribe).toHaveBeenCalledWith(wav, `live:run1:${String(startAt)}`);
    expect(tx.liveTranscriptSegment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          runId: 'run1',
          seq: 0,
          startAt: BigInt(startAt),
          endAt: BigInt(startAt + 6000),
          text: 'hello from the tab',
        }),
      }),
    );
    expect(events.emit).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'caption', runId: 'run1', startAt }),
    ]);
    expect(deps.translations.enqueueCaption).toHaveBeenCalledWith(
      'run1',
      expect.objectContaining({ text: 'hello from the tab' }),
    );
  });
});
