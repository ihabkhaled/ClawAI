import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { TranslationManager } from '../translation.manager';

const context = {
  lease: { runId: 'run-1', generation: 1 },
  streamId: 'st1',
  mode: LiveMode.AUDIO,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date(),
};

const line = (seq: number, text: string, language: string | null = 'en') => ({
  id: `seg-${String(seq)}`,
  seq,
  startAt: seq * 6000,
  endAt: seq * 6000 + 6000,
  text,
  language,
});

describe('TranslationManager', () => {
  const tx = { liveTranslation: { upsert: vi.fn() }, liveProviderCost: { upsert: vi.fn() } };
  const prisma = {
    liveViewerSession: { findMany: vi.fn() },
    liveTranslation: { findMany: vi.fn(), findUnique: vi.fn() },
  };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const model = { complete: vi.fn() };
  const policy = {
    active: vi.fn().mockResolvedValue({ version: 1, config: { summaryModelChain: [] } }),
  };
  const events = { emit: vi.fn() };
  let manager: TranslationManager;

  beforeEach(() => {
    vi.resetAllMocks();
    writer.commit.mockImplementation(
      (_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    );
    policy.active.mockResolvedValue({ version: 1, config: { summaryModelChain: [] } });
    manager = new TranslationManager(
      prisma as never,
      writer as never,
      model as never,
      policy as never,
      events as never,
    );
    prisma.liveViewerSession.findMany.mockResolvedValue([
      { language: 'en' },
      { language: 'ar-EG' },
      { language: 'ar' },
    ]);
    prisma.liveTranslation.findMany.mockResolvedValue([]);
  });

  it('caches active viewer languages for 5 s (distinct base languages)', async () => {
    await expect(manager.activeLanguages('run-1', 0)).resolves.toEqual(['en', 'ar']);
    await manager.activeLanguages('run-1', 4000);
    expect(prisma.liveViewerSession.findMany).toHaveBeenCalledTimes(1);
    await manager.activeLanguages('run-1', 5001);
    expect(prisma.liveViewerSession.findMany).toHaveBeenCalledTimes(2);
  });

  it('serves a cache hit without calling the model', async () => {
    prisma.liveTranslation.findMany.mockResolvedValueOnce([{ targetId: 'seg-1', text: 'مرحبا' }]);
    await manager.translateCaptions(context, [line(1, 'Hello')]);
    expect(model.complete).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        type: LiveStreamEventType.CAPTION_TRANSLATION,
        language: 'ar',
        data: { segmentId: 'seg-1', seq: 1, text: 'مرحبا' },
      }),
    ]);
  });

  it('translates misses two per call, stores them idempotently and skips the source language', async () => {
    model.complete.mockResolvedValueOnce({
      content: '{"items":[{"id":0,"text":"مرحبا"},{"id":1,"text":"عالم"}]}',
      connector: 'OLLAMA',
      model: 'm',
      latencyMs: 5,
    });
    await manager.translateCaptions(context, [line(1, 'Hello'), line(2, 'World')]);
    expect(model.complete).toHaveBeenCalledTimes(1);
    expect(model.complete.mock.calls[0]?.[1].user).toContain('TARGET_LANGUAGE: ar');
    expect(tx.liveTranslation.upsert).toHaveBeenCalledTimes(2);
    expect(tx.liveTranslation.upsert.mock.calls[0]?.[0].where).toEqual({
      targetKind_targetId_language_sourceVersion: {
        targetKind: 'SEGMENT',
        targetId: 'seg-1',
        language: 'ar',
        sourceVersion: 1,
      },
    });
    expect(events.emit.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('rejects a translation that adds a link', async () => {
    model.complete.mockResolvedValueOnce({
      content: '{"items":[{"id":0,"text":"زوروا https://evil.example"}]}',
      connector: 'OLLAMA',
      model: 'm',
      latencyMs: 5,
    });
    await manager.translateCaptions(context, [line(1, 'Hello')]);
    expect(tx.liveTranslation.upsert).not.toHaveBeenCalled();
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create.succeeded).toBe(false);
    expect(events.emit).toHaveBeenCalledWith([]);
  });

  it('batches queued captions and flushes on size or age', async () => {
    model.complete.mockResolvedValue({
      content: '{"items":[{"id":0,"text":"x"},{"id":1,"text":"y"}]}',
      connector: 'O',
      model: 'm',
      latencyMs: 1,
    });
    manager.enqueueCaption('run-1', line(1, 'a'), 0);
    await manager.flushCaptions(context, false, 1000);
    expect(model.complete).not.toHaveBeenCalled();
    await manager.flushCaptions(context, false, 3500);
    expect(model.complete).toHaveBeenCalledTimes(1);
    manager.enqueueCaption('run-1', line(2, 'b'), 4000);
    manager.enqueueCaption('run-1', line(3, 'c'), 4100);
    await manager.flushCaptions(context, false, 4200);
    expect(model.complete).toHaveBeenCalledTimes(2);
    manager.dropRun('run-1');
    await manager.flushCaptions(context, true);
    expect(model.complete).toHaveBeenCalledTimes(2);
  });

  it('translates a card per language with the card version as cache key', async () => {
    prisma.liveTranslation.findUnique.mockResolvedValueOnce(null);
    model.complete.mockResolvedValueOnce({
      content: '{"title":"إصدار","text":"يصدر الثلاثاء"}',
      connector: 'O',
      model: 'm',
      latencyMs: 1,
    });
    await manager.translateCard(
      context,
      {
        id: 'ev-1',
        title: 'Release',
        body: 'Ships Tuesday',
        version: 3,
        startAt: 1000,
        language: 'en',
      },
      LiveStreamEventType.CARD_VERSION,
    );
    expect(tx.liveTranslation.upsert.mock.calls[0]?.[0].create).toMatchObject({
      targetKind: 'EVENT',
      targetId: 'ev-1',
      language: 'ar',
      sourceVersion: 3,
    });
    expect(events.emit).toHaveBeenCalledWith([
      expect.objectContaining({
        type: LiveStreamEventType.CARD_VERSION,
        language: 'ar',
        data: { eventId: 'ev-1', version: 3, title: 'إصدار', body: 'يصدر الثلاثاء' },
      }),
    ]);
  });

  it('serves a cached card translation and survives a model outage', async () => {
    prisma.liveTranslation.findUnique.mockResolvedValueOnce({ title: 'عنوان', text: 'نص' });
    await manager.translateCard(
      context,
      { id: 'ev-1', title: 'T', body: 'B', version: 1, startAt: 0, language: 'en' },
      LiveStreamEventType.CARD,
    );
    expect(model.complete).not.toHaveBeenCalled();
    prisma.liveTranslation.findUnique.mockResolvedValueOnce(null);
    model.complete.mockRejectedValueOnce(new Error('down'));
    await manager.translateCard(
      context,
      { id: 'ev-2', title: 'T', body: 'B', version: 1, startAt: 0, language: 'en' },
      LiveStreamEventType.CARD,
    );
    expect(tx.liveProviderCost.upsert.mock.calls.at(-1)?.[0].create).toMatchObject({
      provider: 'none',
      succeeded: false,
    });
    expect(events.emit).toHaveBeenCalledTimes(1);
  });
});
