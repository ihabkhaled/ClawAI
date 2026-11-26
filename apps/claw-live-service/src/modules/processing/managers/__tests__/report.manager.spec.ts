import { LiveFeedEventKind } from '../../../../generated/prisma';
import { LiveCouncilService } from '../../services/live-council.service';
import { createRunMemory } from '../../utilities/run-memory.utility';
import { ReportManager } from '../report.manager';

const ORIGIN = 1_700_000_000_000;
const MAIN = [{ connector: 'OLLAMA', model: 'gemma', style: 'OLLAMA' }];

function segment(seconds: number, text: string) {
  return {
    id: `s${String(seconds)}`,
    seq: seconds,
    startAt: BigInt(ORIGIN + seconds * 1000),
    endAt: BigInt(ORIGIN + seconds * 1000 + 5000),
    text,
    language: 'en',
  };
}

function reply(payload: unknown) {
  return { content: JSON.stringify(payload), connector: 'OLLAMA', model: 'gemma', latencyMs: 9 };
}

describe('ReportManager', () => {
  const tx = {
    liveFeedEvent: {
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
        id: 'rep-1',
        runId: 'run-1',
        version: 1,
        highlightType: null,
        confidence: null,
        endAt: null,
        ...create,
      })),
    },
    liveProviderCost: { upsert: vi.fn() },
  };
  const prisma = {
    liveProcessingRun: { findUnique: vi.fn() },
    liveTranscriptSegment: { findMany: vi.fn() },
    liveFeedEvent: { findMany: vi.fn() },
    liveViewerSession: { findFirst: vi.fn() },
  };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const model = { complete: vi.fn() };
  const policy = {
    active: vi.fn().mockResolvedValue({
      version: 1,
      config: { summaryModelChain: MAIN, councilModelChain: [] },
    }),
  };
  const events = { emit: vi.fn() };
  const translations = { translateCard: vi.fn() };
  const manager = new ReportManager(
    prisma as never,
    writer as never,
    new LiveCouncilService(writer as never, model as never),
    policy as never,
    events as never,
    translations as never,
  );
  const context = { lease: { runId: 'run-1', generation: 1 } } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.liveProcessingRun.findUnique.mockResolvedValue({
      startedAt: new Date(ORIGIN),
      stream: { accessScope: 'SUMMARY:user-1' },
    });
    prisma.liveTranscriptSegment.findMany.mockResolvedValue([
      segment(2, 'Welcome to the kitchen.'),
      segment(44, 'Crack two eggs.'),
      segment(320, 'Now the oven.'),
    ]);
    prisma.liveFeedEvent.findMany.mockResolvedValue([
      { startAt: BigInt(ORIGIN + 40_000), body: 'A bowl on a table.' },
    ]);
    prisma.liveViewerSession.findFirst.mockResolvedValue({ language: 'en' });
  });

  it('writes a moment-by-moment report per 5-minute part, then the overview, in the viewer language', async () => {
    model.complete
      .mockResolvedValueOnce(
        reply({
          moments: [
            { at: '0:02', text: 'The host welcomes viewers to the kitchen.' },
            { at: '0:44', text: 'She cracks two eggs into a bowl.' },
          ],
          quotes: [{ at: '0:44', text: 'Crack two eggs.' }],
        }),
      )
      .mockResolvedValueOnce(
        reply({ moments: [{ at: '5:20', text: 'The tray goes into the oven.' }], quotes: [] }),
      )
      .mockResolvedValueOnce(
        reply({
          title: 'Egg cooking lesson',
          summary: 'A host cooks eggs step by step.',
          chapters: [
            { at: '0:00', title: 'Getting ready' },
            { at: '5:20', title: 'Baking' },
          ],
        }),
      );
    await manager.writeReport(context, createRunMemory(0));
    const first = model.complete.mock.calls[0]?.[1];
    expect(first.user).toContain('OUTPUT_LANGUAGE: en');
    expect(first.user).toContain('PART_START: 0:00');
    expect(first.user).toContain('[0:44-0:49] Crack two eggs.');
    expect(first.user).toContain('[0:40] A bowl on a table.');
    expect(first.system).toContain('about every 10 seconds');
    expect(first.maxTokens).toBe(4096);
    expect(model.complete.mock.calls[1]?.[1].user).toContain('PART_START: 5:00');
    const created = tx.liveFeedEvent.upsert.mock.calls[0]?.[0].create ?? {};
    expect(created.kind).toBe(LiveFeedEventKind.REPORT);
    expect(created.title).toBe('Egg cooking lesson');
    expect(created.body).toContain('0:44 — She cracks two eggs into a bowl.');
    expect(created.body).toContain('5:20 Baking');
    expect(created.body).toContain('0:44 “Crack two eggs.”');
    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(translations.translateCard).toHaveBeenCalledTimes(1);
  });

  it('writes nothing for a run that is not a one-click summary, or has no transcript', async () => {
    prisma.liveProcessingRun.findUnique.mockResolvedValueOnce({
      startedAt: new Date(ORIGIN),
      stream: { accessScope: 'PUBLIC' },
    });
    await manager.writeReport(context, createRunMemory(0));
    prisma.liveTranscriptSegment.findMany.mockResolvedValueOnce([]);
    await manager.writeReport(context, createRunMemory(0));
    expect(model.complete).not.toHaveBeenCalled();
    expect(tx.liveFeedEvent.upsert).not.toHaveBeenCalled();
  });

  it('skips a part whose reply is invalid and publishes nothing when no part produced moments', async () => {
    model.complete.mockResolvedValue({ ...reply({}), content: 'not json' });
    await manager.writeReport(context, createRunMemory(0));
    expect(tx.liveFeedEvent.upsert).not.toHaveBeenCalled();
    const failed = tx.liveProviderCost.upsert.mock.calls.map(
      (call: { create: { succeeded: boolean } }[]) => call[0]?.create.succeeded,
    );
    expect(failed).toEqual([false, false]);
  });
});
