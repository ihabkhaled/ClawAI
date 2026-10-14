import { GenerationJobsRepository } from '../generation-jobs.repository';

function build() {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const prisma = { threadGenerationJob: { updateMany } };
  return { repository: new GenerationJobsRepository(prisma as never), updateMany };
}

describe('GenerationJobsRepository.addSpend', () => {
  it('increments the job total atomically by integer micro-USD', async () => {
    const { repository, updateMany } = build();

    await repository.addSpend('job-1', 1_500);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { spentMicroCredits: { increment: 1_500n } },
    });
  });

  it('is not fenced on status or attempt, so a cancelled or superseded call still counts', async () => {
    const { repository, updateMany } = build();

    await repository.addSpend('job-1', 3);

    expect(updateMany.mock.calls[0]?.[0]).not.toHaveProperty('where.status');
    expect(updateMany.mock.calls[0]?.[0]).not.toHaveProperty('where.attemptCount');
  });

  it.each([[0], [-5], [1.5], [Number.NaN], [Number.MAX_SAFE_INTEGER + 1]])(
    'ignores %s',
    async (value) => {
      const { repository, updateMany } = build();

      await repository.addSpend('job-1', value);

      expect(updateMany).not.toHaveBeenCalled();
    },
  );
});

describe('GenerationJobsRepository.syncSpend', () => {
  it('raises the persisted spend to the settled total and never lowers it', async () => {
    const { repository, updateMany } = build();

    await repository.syncSpend('job-1', 8_227);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', spentMicroCredits: { lt: 8_227n } },
      data: { spentMicroCredits: 8_227n },
    });
  });

  it.each([[0], [-1], [2.5], [Number.NaN]])('ignores %s', async (value) => {
    const { repository, updateMany } = build();

    await repository.syncSpend('job-1', value);

    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe('GenerationJobsRepository.findLastFailureCode', () => {
  it('reads the code of the newest failed step that has one', async () => {
    const findFirst = vi.fn().mockResolvedValue({ code: 'MODEL_IDLE_TIMEOUT' });
    const repository = new GenerationJobsRepository({
      threadGenerationStep: { findFirst },
    } as never);

    await expect(repository.findLastFailureCode('job-1')).resolves.toBe('MODEL_IDLE_TIMEOUT');
    expect(findFirst).toHaveBeenCalledWith({
      where: { jobId: 'job-1', outcome: 'FAILED', code: { not: null } },
      orderBy: { seq: 'desc' },
      select: { code: true },
    });
  });

  it('is null when no failed step exists', async () => {
    const repository = new GenerationJobsRepository({
      threadGenerationStep: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never);

    await expect(repository.findLastFailureCode('job-1')).resolves.toBeNull();
  });
});
