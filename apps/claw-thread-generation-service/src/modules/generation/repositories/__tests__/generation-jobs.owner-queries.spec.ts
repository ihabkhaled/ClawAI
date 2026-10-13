import { ThreadGenerationStatus } from '../../../../generated/prisma';
import { GenerationJobsRepository } from '../generation-jobs.repository';

function build() {
  const job = {
    findFirst: vi.fn().mockResolvedValue({ id: 'job-1' }),
    findUnique: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(1),
  };
  const prisma = {
    threadGenerationJob: job,
    $transaction: vi.fn(async (operation: (tx: unknown) => unknown) =>
      operation({ threadGenerationJob: job }),
    ),
  };
  const repository = new GenerationJobsRepository(prisma as never);
  return { repository, job };
}

describe('GenerationJobsRepository owner queries', () => {
  it('scopes progress, retry and delete lookups to the owner', async () => {
    const { repository, job } = build();

    await repository.findProgressJob('job-1', 'owner-1');
    await repository.findRetrySource('job-1', 'owner-1');
    await repository.findDeletable('job-1', 'owner-1');

    expect(job.findFirst).toHaveBeenCalledTimes(3);
    for (const call of job.findFirst.mock.calls) {
      expect(call[0].where).toEqual({ id: 'job-1', ownerId: 'owner-1' });
    }
  });

  it('deletes only the owner finished jobs whose budget is closed, in one transaction', async () => {
    const { repository, job } = build();
    job.count.mockResolvedValue(2);
    job.deleteMany.mockResolvedValue({ count: 2 });

    await expect(repository.deleteTerminalChain(['job-2', 'job-1'], 'owner-1')).resolves.toBe(true);

    expect(job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['job-2', 'job-1'] },
        ownerId: 'owner-1',
        budgetClosedAt: { not: null },
        status: {
          in: [
            ThreadGenerationStatus.FAILED,
            ThreadGenerationStatus.CANCELLED,
            ThreadGenerationStatus.WAITING_FOR_REVIEW,
            ThreadGenerationStatus.COMPLETED,
          ],
        },
      },
    });
  });

  it('deletes nothing when any job of the chain no longer qualifies', async () => {
    const { repository, job } = build();
    job.count.mockResolvedValue(1);
    await expect(repository.deleteTerminalChain(['job-2', 'job-1'], 'owner-1')).resolves.toBe(
      false,
    );
    expect(job.deleteMany).not.toHaveBeenCalled();
  });

  it('reports false when the delete removed fewer jobs than the chain', async () => {
    const { repository, job } = build();
    job.count.mockResolvedValue(2);
    job.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repository.deleteTerminalChain(['job-2', 'job-1'], 'owner-1')).resolves.toBe(
      false,
    );
  });

  it('finds the retry child of a job', async () => {
    const { repository, job } = build();
    await repository.findRetryChild('job-1');
    expect(job.findUnique).toHaveBeenCalledWith({
      where: { retriedFromJobId: 'job-1' },
      select: { id: true, status: true },
    });
  });
});
