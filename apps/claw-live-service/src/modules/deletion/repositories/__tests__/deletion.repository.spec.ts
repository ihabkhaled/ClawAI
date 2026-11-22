import { LiveRunStatus } from '../../../../generated/prisma';
import { DeletionRepository } from '../deletion.repository';

type Run = { status: LiveRunStatus; coverageLeft: number };

/** An in-memory transaction client that records every model it touches. */
function build(options: {
  sessions: { id: string; runId: string | null }[];
  coverageRuns: string[];
  runs: Record<string, Run>;
  skipped?: number;
}) {
  const touched = new Set<string>();
  const calls: string[] = [];
  const handlers: Record<string, Record<string, unknown>> = {
    liveViewerSession: {
      findMany: vi.fn().mockResolvedValue(options.sessions),
      count: vi.fn().mockResolvedValue(options.skipped ?? 0),
      deleteMany: vi.fn().mockImplementation(async () => {
        calls.push('sessions.deleteMany');
        return { count: options.sessions.length };
      }),
    },
    liveSessionCoverage: {
      findMany: vi.fn().mockResolvedValue(options.coverageRuns.map((runId) => ({ runId }))),
      count: vi
        .fn()
        .mockImplementation(
          async ({ where }: { where: { runId: string } }) =>
            options.runs[where.runId]?.coverageLeft ?? 0,
        ),
    },
    liveProcessingRun: {
      updateMany: vi
        .fn()
        .mockImplementation(
          async ({
            where,
            data,
          }: {
            where: { id: string; status: { notIn: string[] } };
            data: unknown;
          }) => {
            const run = options.runs[where.id];
            if (!run || where.status.notIn.includes(run.status)) return { count: 0 };
            calls.push(`run.claim:${where.id}:${JSON.stringify(data)}`);
            return { count: 1 };
          },
        ),
    },
    liveTranslation: { deleteMany: vi.fn() },
    liveFeedEvent: { deleteMany: vi.fn() },
    liveTranscriptSegment: { deleteMany: vi.fn() },
    liveMemorySnapshot: { deleteMany: vi.fn() },
    liveRunTombstone: { createMany: vi.fn() },
    liveBillingState: { deleteMany: vi.fn() },
  };
  const tx = new Proxy(
    {},
    {
      get: (_target, name: string) => {
        touched.add(name);
        return handlers[name];
      },
    },
  );
  const prisma = { $transaction: vi.fn((fn: (client: unknown) => unknown) => fn(tx)) };
  return { repository: new DeletionRepository(prisma as never), handlers, touched, calls };
}

const scope = { userId: 'u1', includeActive: false, purgeBillingState: false };

describe('DeletionRepository.deleteForScope', () => {
  it('tombstones a finished run no one else has coverage on, and clears its content', async () => {
    const { repository, handlers, calls } = build({
      sessions: [{ id: 's1', runId: 'r1' }],
      coverageRuns: ['r1'],
      runs: { r1: { status: LiveRunStatus.ENDED, coverageLeft: 0 } },
    });
    const result = await repository.deleteForScope(scope);
    expect(result).toEqual({ sessionsDeleted: 1, skippedActive: 0, tombstonedRunIds: ['r1'] });
    expect(calls).toContain('run.claim:r1:{"status":"DELETED","activeKey":null}');
    for (const model of [
      'liveTranslation',
      'liveFeedEvent',
      'liveTranscriptSegment',
      'liveMemorySnapshot',
    ]) {
      expect(handlers[model]?.['deleteMany']).toHaveBeenCalledWith({ where: { runId: 'r1' } });
    }
    expect(handlers['liveRunTombstone']?.['createMany']).toHaveBeenCalledWith({
      data: [{ runId: 'r1' }],
      skipDuplicates: true,
    });
    // sessions go before the run content is judged
    expect(calls[0]).toBe('sessions.deleteMany');
  });

  it('keeps a shared run while another viewer still has coverage on it', async () => {
    const { repository, handlers } = build({
      sessions: [{ id: 's1', runId: 'r1' }],
      coverageRuns: ['r1'],
      runs: { r1: { status: LiveRunStatus.ENDED, coverageLeft: 2 } },
    });
    const result = await repository.deleteForScope(scope);
    expect(result.tombstonedRunIds).toEqual([]);
    expect(handlers['liveFeedEvent']?.['deleteMany']).not.toHaveBeenCalled();
    expect(handlers['liveRunTombstone']?.['createMany']).not.toHaveBeenCalled();
  });

  it.each([
    LiveRunStatus.ACTIVE,
    LiveRunStatus.DELAYED,
    LiveRunStatus.PENDING,
    LiveRunStatus.STOPPING,
  ])('leaves a %s run untouched', async (status) => {
    const { repository, handlers } = build({
      sessions: [{ id: 's1', runId: 'r1' }],
      coverageRuns: [],
      runs: { r1: { status, coverageLeft: 0 } },
    });
    const result = await repository.deleteForScope(scope);
    expect(result.tombstonedRunIds).toEqual([]);
    expect(handlers['liveFeedEvent']?.['deleteMany']).not.toHaveBeenCalled();
  });

  it('does not tombstone a run twice', async () => {
    const { repository } = build({
      sessions: [{ id: 's1', runId: 'r1' }],
      coverageRuns: [],
      runs: { r1: { status: LiveRunStatus.DELETED, coverageLeft: 0 } },
    });
    expect((await repository.deleteForScope(scope)).tombstonedRunIds).toEqual([]);
  });

  it('never touches the financial tables', async () => {
    const { repository, touched } = build({
      sessions: [{ id: 's1', runId: 'r1' }],
      coverageRuns: ['r1'],
      runs: { r1: { status: LiveRunStatus.STOPPED, coverageLeft: 0 } },
    });
    await repository.deleteForScope({ ...scope, includeActive: true, purgeBillingState: true });
    expect(touched.has('liveUsageCharge')).toBe(false);
    expect(touched.has('liveUsageMonth')).toBe(false);
    expect(touched.has('liveProviderCost')).toBe(false);
    expect(touched.has('liveBillingState')).toBe(true);
  });

  it('reports the sessions it skipped because a viewer is still attached', async () => {
    const { repository } = build({ sessions: [], coverageRuns: [], runs: {}, skipped: 2 });
    expect(await repository.deleteForScope(scope)).toEqual({
      sessionsDeleted: 0,
      skippedActive: 2,
      tombstonedRunIds: [],
    });
  });

  it('looks up one owned session', async () => {
    const prisma = {
      liveViewerSession: { findFirst: vi.fn().mockResolvedValue({ id: 's1', state: 'DETACHED' }) },
    };
    const repository = new DeletionRepository(prisma as never);
    await expect(repository.findOwnedSession('u1', 's1')).resolves.toEqual({
      id: 's1',
      state: 'DETACHED',
    });
    expect(prisma.liveViewerSession.findFirst).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      select: { id: true, state: true },
    });
  });
});
