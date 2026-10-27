import { GenerationJobsRepository } from '../generation-jobs.repository';

describe('saved model checkpoints', () => {
  it('replaces a stale input checkpoint and keeps an already matching one', async () => {
    const row: Record<string, unknown> = {
      inputHash: 'old-input',
      evidenceBundleHash: 'evidence',
      output: { answer: 'old' },
    };
    const communication = {
      findUnique: vi.fn(async () => row),
      upsert: vi.fn(async () => row),
      updateMany: vi.fn(
        async (args: {
          where: {
            OR: Array<{ inputHash?: { not: string }; evidenceBundleHash?: { not: string } }>;
          };
          data: Record<string, unknown>;
        }) => {
          const differs = args.where.OR.some(
            (condition) =>
              Boolean(condition.inputHash && row['inputHash'] !== condition.inputHash.not) ||
              Boolean(
                condition.evidenceBundleHash &&
                row['evidenceBundleHash'] !== condition.evidenceBundleHash.not,
              ),
          );
          if (differs) Object.assign(row, args.data);
          return { count: differs ? 1 : 0 };
        },
      ),
    };
    const tx = {
      threadGenerationJob: { findFirst: vi.fn().mockResolvedValue({ id: 'job-1' }) },
      threadModelCommunication: communication,
    };
    const repository = new GenerationJobsRepository({
      threadModelCommunication: communication,
      $transaction: (run: (value: typeof tx) => unknown) => run(tx),
    } as never);
    const input = {
      jobId: 'job-1',
      attempt: 2,
      role: 'author-1',
      round: 1,
      inputHash: 'new-input',
      evidenceHash: 'evidence',
      response: {
        provider: 'GROK',
        model: 'working',
        content: 'answer',
        durationMs: 1,
        clamped: false,
      },
      output: { answer: 'new' },
    };

    await repository.saveCommunication(input);
    expect(
      await repository.findCommunication('job-1', 'author-1', 1, 'evidence', 'new-input'),
    ).toEqual({ answer: 'new' });
    await repository.saveCommunication({ ...input, output: { answer: 'duplicate' } });
    expect(
      await repository.findCommunication('job-1', 'author-1', 1, 'evidence', 'new-input'),
    ).toEqual({ answer: 'new' });
    await repository.saveCommunication({
      ...input,
      evidenceHash: 'new-evidence',
      output: { answer: 'revised' },
    });
    expect(
      await repository.findCommunication('job-1', 'author-1', 1, 'new-evidence', 'new-input'),
    ).toEqual({ answer: 'revised' });
    tx.threadGenerationJob.findFirst.mockResolvedValueOnce(null);
    expect(
      await repository.saveCommunication({ ...input, output: { answer: 'stale attempt' } }),
    ).toBe(false);
    expect(
      await repository.findCommunication('job-1', 'author-1', 1, 'new-evidence', 'new-input'),
    ).toEqual({ answer: 'revised' });
  });
});
