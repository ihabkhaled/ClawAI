import { LiveChunkOutcome } from '../../../../common/enums/live-chunk-outcome.enum';
import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { createRunMemory } from '../../utilities/run-memory.utility';
import { TranscriptManager } from '../transcript.manager';

const context = {
  lease: { runId: 'run-1', generation: 1 },
  streamId: 'st1',
  mode: LiveMode.AUDIO,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date(),
};
const chunk = { wav: Buffer.from('RIFF'), startAt: 60_000, endAt: 66_000 };
const sttReply = {
  text: ' Hello world ',
  language: 'en',
  provider: 'GEMINI',
  model: 'flash',
  durationSeconds: 6,
  costMicroUsd: 12,
  costKnown: true,
  noSpeech: false,
};

describe('TranscriptManager', () => {
  const tx = {
    liveProcessingRun: { update: vi.fn() },
    liveTranscriptSegment: { create: vi.fn() },
    liveProviderCost: { upsert: vi.fn() },
    liveFeedEvent: { upsert: vi.fn() },
  };
  const stt = { transcribe: vi.fn() };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const events = { emit: vi.fn() };
  const manager = new TranscriptManager(stt as never, writer as never, events as never);

  beforeEach(() => vi.clearAllMocks());

  it('commits a segment with the run seq, its STT cost (stt:<run>:<seq>) and a CAPTION', async () => {
    stt.transcribe.mockResolvedValueOnce(sttReply);
    tx.liveProcessingRun.update.mockResolvedValueOnce({ nextSegmentSeq: 5 });
    tx.liveTranscriptSegment.create.mockResolvedValueOnce({ id: 'seg-4' });
    const memory = createRunMemory(0);
    const result = await manager.handleChunk(context, memory, chunk);
    expect(stt.transcribe).toHaveBeenCalledWith(chunk.wav, 'live:run-1:60000');
    expect(result.outcome).toBe(LiveChunkOutcome.TEXT);
    expect(tx.liveProcessingRun.update.mock.calls[0]?.[0].data).toEqual({
      nextSegmentSeq: { increment: 1 },
      checkpointAt: 66_000n,
    });
    expect(tx.liveTranscriptSegment.create.mock.calls[0]?.[0].data).toMatchObject({
      runId: 'run-1',
      seq: 4,
      startAt: 60_000n,
      endAt: 66_000n,
      text: 'Hello world',
    });
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { idempotencyKey: 'stt:run-1:4' },
      create: { stage: 'STT', costMicroUsd: 12n },
    });
    // Caption latency (speech end → commit) is recorded for the admin p95.
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create.latencyMs).toBeGreaterThan(0);
    expect(events.emit.mock.calls[0]?.[0][0]).toMatchObject({
      type: LiveStreamEventType.CAPTION,
      startAt: 60_000,
      endAt: 66_000,
      data: { seq: 4, text: 'Hello world' },
    });
    expect(memory.recent).toHaveLength(1);
    expect(memory.pendingTranscriptMs).toBe(6000);
    expect(memory.pendingFirst?.seq).toBe(4);
    expect(memory.lastSpeechEndAt).toBe(66_000);
  });

  it('records no speech as a silence: checkpoint + cost, no segment, no caption', async () => {
    stt.transcribe.mockResolvedValueOnce({ ...sttReply, text: '', noSpeech: true });
    const memory = createRunMemory(0);
    const result = await manager.handleChunk(context, memory, chunk);
    expect(result).toEqual({ outcome: LiveChunkOutcome.SILENCE, line: null });
    expect(tx.liveTranscriptSegment.create).not.toHaveBeenCalled();
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].where.idempotencyKey).toBe(
      'stt:run-1:t60000',
    );
    expect(events.emit).not.toHaveBeenCalled();
    expect(memory.lastMediaAt).toBe(66_000);
    expect(memory.lastSpeechEndAt).toBeNull();
  });

  it('marks a GAP when STT fails after retries (never invents text)', async () => {
    stt.transcribe.mockResolvedValueOnce(null);
    const result = await manager.handleChunk(context, createRunMemory(0), chunk);
    expect(result.outcome).toBe(LiveChunkOutcome.GAP);
    expect(tx.liveFeedEvent.upsert.mock.calls[0]?.[0].create).toMatchObject({
      eventKey: 'gap:60000',
      kind: 'GAP',
    });
    expect(tx.liveTranscriptSegment.create).not.toHaveBeenCalled();
  });

  it('keeps only the last 90 s of transcript in memory', async () => {
    const memory = createRunMemory(0);
    memory.recent = [{ id: 'old', seq: 0, startAt: 0, endAt: 6000, text: 'old', language: 'en' }];
    stt.transcribe.mockResolvedValueOnce(sttReply);
    tx.liveProcessingRun.update.mockResolvedValueOnce({ nextSegmentSeq: 2 });
    tx.liveTranscriptSegment.create.mockResolvedValueOnce({ id: 'seg-1' });
    await manager.handleChunk(context, memory, { ...chunk, startAt: 200_000, endAt: 206_000 });
    expect(memory.recent.map((l) => l.id)).toEqual(['seg-1']);
  });
});
