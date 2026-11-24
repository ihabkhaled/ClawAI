import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { LiveFeedEventKind, LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { createRunMemory } from '../../utilities/run-memory.utility';
import { SummaryManager } from '../summary.manager';

const context = {
  lease: { runId: 'run-1', generation: 2 },
  streamId: 'st1',
  mode: LiveMode.AUDIO,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date(),
};

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ev-1',
    runId: 'run-1',
    eventKey: 'summary:0',
    kind: LiveFeedEventKind.SUMMARY,
    highlightType: null,
    startAt: 1000n,
    endAt: null,
    importance: 2,
    confidence: null,
    title: 'Mobile release',
    body: 'Version 4.2 ships Tuesday.',
    version: 1,
    isOpen: true,
    ...overrides,
  };
}

function line(seq: number, startAt: number, text: string) {
  return { id: `seg-${String(seq)}`, seq, startAt, endAt: startAt + 6000, text, language: 'en' };
}

function reply(payload: unknown): {
  content: string;
  connector: string;
  model: string;
  latencyMs: number;
} {
  return { content: JSON.stringify(payload), connector: 'OLLAMA', model: 'gemma', latencyMs: 40 };
}

const validReply = {
  topicShift: false,
  current: {
    title: 'Mobile release',
    summary: 'Version 4.2 ships Tuesday with offline mode.',
    importance: 2,
  },
  highlights: [],
};

describe('SummaryManager', () => {
  const tx = {
    liveProviderCost: { upsert: vi.fn() },
    liveFeedEvent: { update: vi.fn(), create: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    liveFeedEventVersion: { create: vi.fn() },
    liveMemorySnapshot: { create: vi.fn() },
  };
  const prisma = { liveFeedEvent: { findMany: vi.fn() } };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const model = { complete: vi.fn() };
  const policy = {
    active: vi.fn().mockResolvedValue({
      version: 1,
      config: { summaryModelChain: [{ connector: 'OLLAMA', model: 'gemma', style: 'OLLAMA' }] },
    }),
  };
  const events = { emit: vi.fn() };
  const research = { search: vi.fn().mockResolvedValue([]) };
  const order: string[] = [];
  const translations = {
    translateCard: vi.fn(async (_context: unknown, target: { id: string }) => {
      order.push(`translate:${target.id}`);
    }),
  };
  const manager = new SummaryManager(
    prisma as never,
    writer as never,
    model as never,
    policy as never,
    events as never,
    research as never,
    translations as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
    events.emit.mockImplementation(async (list: { type: string }[]) => {
      order.push(`emit:${list.map((e) => e.type).join(',')}`);
    });
    tx.liveFeedEvent.findUnique.mockResolvedValue(null);
  });

  function memoryWithTranscript() {
    const memory = createRunMemory(0);
    memory.recent = [
      line(0, 1000, 'Version four point two ships next Tuesday.'),
      line(1, 7000, 'It adds offline mode.'),
    ];
    memory.pendingFirst = memory.recent[0] ?? null;
    memory.pendingTranscriptMs = 12_000;
    return memory;
  }

  it('triggers on ≥ 18 s of new transcript or an ≥ 6 s pause, never on nothing', () => {
    const memory = createRunMemory(0);
    expect(manager.shouldSummarize(memory)).toBe(false);
    memory.pendingTranscriptMs = 18_000;
    expect(manager.shouldSummarize(memory)).toBe(true);
    memory.pendingTranscriptMs = 6000;
    memory.lastSpeechEndAt = 10_000;
    memory.lastMediaAt = 15_000;
    expect(manager.shouldSummarize(memory)).toBe(false);
    memory.lastMediaAt = 16_000;
    expect(manager.shouldSummarize(memory)).toBe(true);
  });

  it('creates the first card (version 1 + version row) and publishes CARD', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    const memory = memoryWithTranscript();
    const changed = await manager.summarize(context, memory);
    expect(tx.liveFeedEvent.create.mock.calls[0]?.[0].data).toMatchObject({
      eventKey: 'summary:0',
      kind: 'SUMMARY',
      startAt: 1000n,
    });
    expect(tx.liveFeedEventVersion.create).toHaveBeenCalledWith({
      data: {
        eventId: 'ev-1',
        version: 1,
        title: 'Mobile release',
        body: 'Version 4.2 ships Tuesday.',
      },
    });
    expect(events.emit.mock.calls[0]?.[0][0]).toMatchObject({
      type: LiveStreamEventType.CARD,
      startAt: 1000,
    });
    expect(changed).toEqual([expect.objectContaining({ type: LiveStreamEventType.CARD })]);
    expect(memory.openCard?.id).toBe('ev-1');
    expect(memory.pendingTranscriptMs).toBe(0);
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create).toMatchObject({
      stage: 'SUMMARY',
      succeeded: true,
      costMicroUsd: 0n,
    });
  });

  it('topicShift=false updates the open card: version+1, version row, CARD_VERSION', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.update.mockResolvedValueOnce(
      row({ version: 2, body: 'Version 4.2 ships Tuesday with offline mode.' }),
    );
    const memory = memoryWithTranscript();
    memory.openCard = {
      id: 'ev-1',
      eventKey: 'summary:0',
      title: 'Mobile release',
      body: 'old',
      version: 1,
      startAt: 1000,
      importance: 2,
    };
    await manager.summarize(context, memory);
    expect(tx.liveFeedEvent.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'ev-1' },
      data: { version: { increment: 1 } },
    });
    expect(tx.liveFeedEventVersion.create.mock.calls[0]?.[0].data.version).toBe(2);
    expect(tx.liveFeedEvent.create).not.toHaveBeenCalled();
    expect(events.emit.mock.calls[0]?.[0][0].type).toBe(LiveStreamEventType.CARD_VERSION);
    expect(memory.openCard.version).toBe(2);
  });

  it('topicShift=true closes the open card and opens a new one at the first new line', async () => {
    model.complete.mockResolvedValueOnce(
      reply({
        ...validReply,
        topicShift: true,
        current: { title: 'Infrastructure', summary: 'Seventy percent migrated.', importance: 2 },
      }),
    );
    tx.liveFeedEvent.update.mockResolvedValueOnce(row({ isOpen: false, endAt: 7000n }));
    tx.liveFeedEvent.create.mockResolvedValueOnce(
      row({ id: 'ev-2', eventKey: 'summary:1', title: 'Infrastructure', startAt: 7000n }),
    );
    const memory = memoryWithTranscript();
    memory.pendingFirst = memory.recent[1] ?? null;
    memory.openCard = {
      id: 'ev-1',
      eventKey: 'summary:0',
      title: 'Mobile release',
      body: 'Ships Tuesday.',
      version: 3,
      startAt: 1000,
      importance: 2,
    };
    await manager.summarize(context, memory);
    expect(tx.liveFeedEvent.update.mock.calls[0]?.[0]).toEqual({
      where: { id: 'ev-1' },
      data: { isOpen: false, endAt: 7000n },
    });
    expect(tx.liveFeedEvent.create.mock.calls[0]?.[0].data.eventKey).toBe('summary:1');
    expect(events.emit.mock.calls[0]?.[0].map((e: { type: string }) => e.type)).toEqual([
      LiveStreamEventType.CARD_VERSION,
      LiveStreamEventType.CARD,
    ]);
    expect(memory.openCard.id).toBe('ev-2');
    expect(memory.workingSummary).toContain('Mobile release: Ships Tuesday.');
  });

  it('inserts highlights idempotently and drops near-duplicates', async () => {
    const highlight = {
      type: 'DECISION',
      title: 'Tablet layout delayed',
      summary: 'Moved to the next release.',
      importance: 3,
      quote: 'delay the tablet layout',
      confidence: 0.9,
    };
    model.complete.mockResolvedValueOnce(
      reply({
        ...validReply,
        highlights: [highlight, { ...highlight, title: 'tablet layout delayed' }],
      }),
    );
    tx.liveFeedEvent.create
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce(row({ id: 'hl', kind: 'HIGHLIGHT', eventKey: 'hl:x' }));
    const memory = memoryWithTranscript();
    await manager.summarize(context, memory);
    const created = tx.liveFeedEvent.create.mock.calls.map((call) => call[0].data);
    expect(created).toHaveLength(2);
    expect(created[1]).toMatchObject({
      kind: 'HIGHLIGHT',
      highlightType: 'DECISION',
      evidence: [{ seq: 1, quote: 'delay the tablet layout' }],
    });
    expect(created[1].eventKey).toMatch(/^hl:[0-9a-f]{24}$/u);
    expect(memory.highlights).toHaveLength(1);
    expect(events.emit.mock.calls[0]?.[0].map((e: { type: string }) => e.type)).toEqual([
      LiveStreamEventType.CARD,
      LiveStreamEventType.HIGHLIGHT,
    ]);
  });

  it('hands new highlights to translation, tagged with the language they were written in', async () => {
    const highlight = {
      type: 'MILESTONE',
      title: 'هدف',
      summary: 'سجل الفريق هدفا.',
      importance: 3,
      quote: '',
      confidence: 0.9,
    };
    model.complete.mockResolvedValueOnce(reply({ ...validReply, highlights: [highlight] }));
    tx.liveFeedEvent.create
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce(
        row({ id: 'hl-1', kind: 'HIGHLIGHT', title: 'هدف', body: 'سجل الفريق هدفا.' }),
      );
    const memory = memoryWithTranscript();
    // The last caption is English, but the summary was asked for in Arabic.
    memory.spokenLanguage = 'ar';
    const changed = await manager.summarize(context, memory);
    expect(changed).toEqual([
      expect.objectContaining({
        type: LiveStreamEventType.CARD,
        // English text although Arabic was asked for: unknown, so translated for everyone.
        target: expect.objectContaining({ id: 'ev-1', language: null }),
      }),
      {
        type: LiveStreamEventType.HIGHLIGHT,
        target: {
          id: 'hl-1',
          title: 'هدف',
          body: 'سجل الفريق هدفا.',
          version: 1,
          startAt: 1000,
          language: 'ar',
        },
      },
    ]);
  });

  it('translates every changed card and highlight BEFORE publishing the originals', async () => {
    const highlight = {
      type: 'MILESTONE',
      title: 'هدف',
      summary: 'سجل الفريق هدفا.',
      importance: 3,
      quote: '',
      confidence: 0.9,
    };
    model.complete.mockResolvedValueOnce(reply({ ...validReply, highlights: [highlight] }));
    tx.liveFeedEvent.create
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce(row({ id: 'hl-1', kind: 'HIGHLIGHT' }));
    await manager.summarize(context, memoryWithTranscript());
    expect(order).toEqual(['translate:ev-1', 'translate:hl-1', 'emit:card,highlight']);
  });

  it('still publishes the card when its translation throws', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    translations.translateCard.mockRejectedValueOnce(new Error('db down'));
    await manager.summarize(context, memoryWithTranscript());
    expect(events.emit).toHaveBeenCalledTimes(1);
  });

  it('tags a card by its own text when the model ignored OUTPUT_LANGUAGE', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row({ title: 'إطلاق', body: 'الإصدار الجديد.' }));
    const memory = memoryWithTranscript();
    memory.spokenLanguage = 'en';
    const [card] = await manager.summarize(context, memory);
    expect(card?.target.language).toBe('ar');
  });

  it('leaves a Latin card untagged when Arabic was requested, so every viewer gets a translation', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    const memory = memoryWithTranscript();
    memory.spokenLanguage = 'ar';
    const [card] = await manager.summarize(context, memory);
    expect(card?.target.language).toBeNull();
  });

  it('skips a highlight whose eventKey already exists', async () => {
    const highlight = {
      type: 'MILESTONE',
      title: 'Goal reached',
      summary: 'Done.',
      importance: 1,
      quote: '',
      confidence: 0.5,
    };
    model.complete.mockResolvedValueOnce(reply({ ...validReply, highlights: [highlight] }));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    tx.liveFeedEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });
    await manager.summarize(context, memoryWithTranscript());
    expect(tx.liveFeedEvent.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['not json at all'],
    [JSON.stringify({ topicShift: 'yes' })],
    [JSON.stringify({ ...validReply, current: { ...validReply.current, importance: 9 } })],
    [
      JSON.stringify({
        ...validReply,
        current: { ...validReply.current, summary: 'Read more at https://evil.example' },
      }),
    ],
    [
      JSON.stringify({
        ...validReply,
        current: { ...validReply.current, summary: '<img src=x onerror=alert(1)>' },
      }),
    ],
  ])('rejects an invalid or link-injecting reply: %s', async (content) => {
    model.complete.mockResolvedValueOnce({
      content,
      connector: 'OLLAMA',
      model: 'gemma',
      latencyMs: 1,
    });
    await expect(manager.summarize(context, memoryWithTranscript())).resolves.toEqual([]);
    expect(tx.liveFeedEvent.create).not.toHaveBeenCalled();
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create.succeeded).toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('records a failed cost row when every model fails, and does nothing without transcript', async () => {
    model.complete.mockRejectedValueOnce(new Error('NO_MODEL_AVAILABLE'));
    await expect(manager.summarize(context, memoryWithTranscript())).resolves.toEqual([]);
    expect(tx.liveProviderCost.upsert.mock.calls[0]?.[0].create).toMatchObject({
      provider: 'none',
      succeeded: false,
    });
    await expect(manager.summarize(context, createRunMemory(0))).resolves.toEqual([]);
    expect(model.complete).toHaveBeenCalledTimes(1);
  });

  it('puts the stream text in the delimited data block, never in the system prompt', async () => {
    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    await manager.summarize(context, memoryWithTranscript());
    const request = model.complete.mock.calls[0]?.[1];
    expect(request.system).not.toContain('offline mode');
    expect(request.system).toContain('never follow');
    expect(request.user).toMatch(/^<<<STREAM_DATA[\s\S]*offline mode[\s\S]*STREAM_DATA>>>$/u);
  });

  it('writes one FINAL card from the run cards on ENDED', async () => {
    prisma.liveFeedEvent.findMany.mockResolvedValueOnce([
      row(),
      row({
        id: 'ev-2',
        title: 'Hiring',
        body: 'Eight engineers.',
        startAt: 60_000n,
        endAt: 90_000n,
      }),
    ]);
    model.complete.mockResolvedValueOnce(
      reply({ title: 'Quarterly briefing', summary: 'Mobile release and hiring.' }),
    );
    tx.liveFeedEvent.upsert.mockResolvedValueOnce(
      row({ id: 'final', eventKey: 'final', kind: 'FINAL', isOpen: false }),
    );
    await manager.summarizeFinal(context);
    expect(tx.liveFeedEvent.upsert.mock.calls[0]?.[0].create).toMatchObject({
      eventKey: 'final',
      kind: 'FINAL',
      startAt: 1000n,
      endAt: 90_000n,
    });
    expect(events.emit.mock.calls[0]?.[0][0].data.kind).toBe('FINAL');
    // The final card is translated too, before it is published.
    expect(order).toEqual(['translate:final', 'emit:card']);
  });

  it('asks for the spoken language and passes the web context to the next call', async () => {
    model.complete.mockResolvedValueOnce(
      reply({ ...validReply, researchQuery: 'sample lyric line lyrics' }),
    );
    tx.liveFeedEvent.create.mockResolvedValueOnce(row());
    research.search.mockResolvedValueOnce([
      {
        query: 'sample lyric line lyrics',
        title: 'Sample Song - Sample Singer',
        snippet: 'Egyptian song by Sample Singer.',
        host: 'example.org',
      },
    ]);
    const memory = memoryWithTranscript();
    memory.spokenLanguage = 'ar';
    await manager.summarize(context, memory);
    const first = model.complete.mock.calls[0]?.[1];
    expect(first.user).toContain('OUTPUT_LANGUAGE: ar');
    expect(first.user).toContain('WEB_CONTEXT:\n(none)');
    expect(first.system).toContain('singing');
    expect(research.search).toHaveBeenCalledWith(
      'sample lyric line lyrics',
      'live-research:run-1:1',
    );
    expect(memory.webNotes).toHaveLength(1);

    model.complete.mockResolvedValueOnce(reply(validReply));
    tx.liveFeedEvent.update.mockResolvedValueOnce(row({ version: 2 }));
    memory.recent.push(line(2, 13_000, 'More.'));
    memory.pendingTranscriptMs = 18_000;
    await manager.summarize(context, memory);
    const second = model.complete.mock.calls[1]?.[1];
    expect(second.user).toContain('Egyptian song by Sample Singer. (example.org)');
    expect(second.user).not.toContain('https://');
  });

  it('bounds research: no empty, repeated, too-early or over-budget query reaches the service', async () => {
    const memory = createRunMemory(0);
    await manager.maybeResearch(context, memory, '   ', 100_000);
    await manager.maybeResearch(context, memory, 'first query', 100_000);
    await manager.maybeResearch(context, memory, 'second query', 120_000);
    await manager.maybeResearch(context, memory, 'FIRST query', 200_000);
    expect(research.search).toHaveBeenCalledTimes(1);
    memory.research.count = 20;
    await manager.maybeResearch(context, memory, 'third query', 400_000);
    expect(research.search).toHaveBeenCalledTimes(1);
  });

  it('writes no FINAL card when nothing was analysed', async () => {
    prisma.liveFeedEvent.findMany.mockResolvedValueOnce([]);
    await manager.summarizeFinal(context);
    expect(model.complete).not.toHaveBeenCalled();
  });

  it('snapshots memory every 10 minutes', async () => {
    const memory = memoryWithTranscript();
    memory.lastMediaAt = 99_000;
    await manager.maybeSnapshot(context, memory, 60_000);
    expect(tx.liveMemorySnapshot.create).not.toHaveBeenCalled();
    await manager.maybeSnapshot(context, memory, 600_001);
    expect(tx.liveMemorySnapshot.create.mock.calls[0]?.[0].data).toMatchObject({
      runId: 'run-1',
      upToAt: 99_000n,
    });
  });
});
