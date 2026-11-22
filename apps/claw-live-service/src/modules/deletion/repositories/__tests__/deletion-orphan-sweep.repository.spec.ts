import { LiveRunStatus } from '../../../../generated/prisma';
import { DeletionRepository } from '../deletion.repository';

function build(candidates: string[], coverageLeft: Record<string, number>, claimable: string[]) {
  const deleted: string[] = [];
  const tx = {
    liveSessionCoverage: {
      count: vi.fn(
        async ({ where }: { where: { runId: string } }) => coverageLeft[where.runId] ?? 0,
      ),
    },
    liveProcessingRun: {
      updateMany: vi.fn(async ({ where }: { where: { id: string } }) => ({
        count: claimable.includes(where.id) ? 1 : 0,
      })),
    },
    liveTranslation: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    liveFeedEvent: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    liveTranscriptSegment: {
      deleteMany: vi.fn(async ({ where }: { where: { runId: string } }) => {
        deleted.push(where.runId);
        return { count: 1 };
      }),
    },
    liveMemorySnapshot: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    liveRunTombstone: { createMany: vi.fn(async () => ({ count: 1 })) },
  };
  const prisma = {
    liveProcessingRun: { findMany: vi.fn(async () => candidates.map((id) => ({ id }))) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<boolean>) => fn(tx)),
  };
  return { prisma, deleted, repository: new DeletionRepository(prisma as never) };
}

describe('DeletionRepository.sweepOrphanRuns', () => {
  it('asks only for finished runs with no session left', async () => {
    const { prisma, repository } = build([], {}, []);
    await repository.sweepOrphanRuns(5);
    expect(prisma.liveProcessingRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: [LiveRunStatus.STOPPED, LiveRunStatus.ENDED, LiveRunStatus.FAILED] },
          sessions: { none: {} },
        },
        take: 5,
      }),
    );
  });

  it('tombstones unreferenced runs and skips covered or reclaimed ones', async () => {
    const { repository, deleted } = build(['a', 'b', 'c'], { b: 1 }, ['a']);
    await expect(repository.sweepOrphanRuns(10)).resolves.toEqual(['a']);
    expect(deleted).toEqual(['a']);
  });
});
