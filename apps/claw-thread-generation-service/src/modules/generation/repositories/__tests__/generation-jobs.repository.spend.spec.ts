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
