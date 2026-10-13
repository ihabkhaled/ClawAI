import { Prisma } from '../../../../generated/prisma';
import { GenerationStepsRepository } from '../../repositories/generation-steps.repository';
import { GenerationProgressService } from '../generation-progress.service';
import { StepRecorder } from '../step-recorder.service';

describe('StepRecorder', () => {
  it('stores a step with defaults and a redacted excerpt', async () => {
    const steps = { append: vi.fn().mockResolvedValue(true) };
    await new StepRecorder(steps as never).record('job-1', {
      stage: 'JUDGE',
      outcome: 'SUCCEEDED',
      roleKind: 'JUDGE',
      rawExcerpt: 'see https://a.org/x?secret=1',
    });
    expect(steps.append).toHaveBeenCalledWith('job-1', {
      stage: 'JUDGE',
      round: 0,
      outcome: 'SUCCEEDED',
      roleKind: 'JUDGE',
      roleId: null,
      provider: null,
      model: null,
      code: null,
      httpStatus: null,
      durationMs: null,
      inputTokens: null,
      outputTokens: null,
      excerpt: 'see https://a.org/x',
    });
  });

  it('never throws into the pipeline when storage fails', async () => {
    const steps = { append: vi.fn().mockRejectedValue(new Error('db down')) };
    await expect(
      new StepRecorder(steps as never).record('job-1', {
        stage: 'JUDGE',
        outcome: 'FAILED',
        roleKind: 'JUDGE',
      }),
    ).resolves.toBeUndefined();
  });

  it('never throws when the sequence stays contended', async () => {
    const steps = { append: vi.fn().mockResolvedValue(false) };
    await expect(
      new StepRecorder(steps as never).record('job-1', {
        stage: 'JUDGE',
        outcome: 'FAILED',
        roleKind: 'JUDGE',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('GenerationStepsRepository', () => {
  const data = {
    stage: 'JUDGE',
    round: 1,
    outcome: 'FAILED',
    roleKind: 'JUDGE',
    roleId: null,
    provider: null,
    model: null,
    code: null,
    httpStatus: null,
    durationMs: null,
    inputTokens: null,
    outputTokens: null,
    excerpt: null,
  };
  const raced = () =>
    new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' });

  it('appends with the next sequence number', async () => {
    const prisma = {
      threadGenerationStep: {
        findFirst: vi.fn().mockResolvedValue({ seq: 4 }),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    await expect(
      new GenerationStepsRepository(prisma as never).append('job-1', data),
    ).resolves.toBe(true);
    expect(prisma.threadGenerationStep.create).toHaveBeenCalledWith({
      data: { jobId: 'job-1', seq: 5, ...data },
    });
  });

  it('starts at 1 and retries after a sequence race', async () => {
    const prisma = {
      threadGenerationStep: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValueOnce(raced()).mockResolvedValue({}),
      },
    };
    await expect(
      new GenerationStepsRepository(prisma as never).append('job-1', data),
    ).resolves.toBe(true);
    expect(prisma.threadGenerationStep.create).toHaveBeenCalledTimes(2);
  });

  it('gives up after bounded sequence races', async () => {
    const prisma = {
      threadGenerationStep: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(raced()),
      },
    };
    await expect(
      new GenerationStepsRepository(prisma as never).append('job-1', data),
    ).resolves.toBe(false);
    expect(prisma.threadGenerationStep.create).toHaveBeenCalledTimes(5);
  });

  it('reports an unrelated storage error as not stored, without retrying', async () => {
    const prisma = {
      threadGenerationStep: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(new Error('disk')),
      },
    };
    await expect(
      new GenerationStepsRepository(prisma as never).append('job-1', data),
    ).resolves.toBe(false);
    expect(prisma.threadGenerationStep.create).toHaveBeenCalledOnce();
  });

  const stepRow = (seq: number) => ({ seq });

  it('lists the newest steps oldest first', async () => {
    const prisma = {
      threadGenerationStep: {
        findMany: vi.fn().mockResolvedValue([stepRow(3), stepRow(2), stepRow(1)]),
        findFirst: vi.fn(),
      },
    };
    const result = await new GenerationStepsRepository(prisma as never).list('job-1');
    expect(prisma.threadGenerationStep.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobId: 'job-1' }, orderBy: { seq: 'desc' }, take: 500 }),
    );
    expect(result.map((row) => row.seq)).toEqual([1, 2, 3]);
    expect(prisma.threadGenerationStep.findFirst).not.toHaveBeenCalled();
  });

  it('keeps the newest steps and the first one when the job has more than the cap', async () => {
    const newest = Array.from({ length: 500 }, (_, index) => stepRow(700 - index));
    const prisma = {
      threadGenerationStep: {
        findMany: vi.fn().mockResolvedValue(newest),
        findFirst: vi.fn().mockResolvedValue(stepRow(1)),
      },
    };
    const result = await new GenerationStepsRepository(prisma as never).list('job-1');
    expect(result).toHaveLength(500);
    expect(result[0]?.seq).toBe(1);
    expect(result.at(-1)?.seq).toBe(700);
    expect(result[1]?.seq).toBe(202);
  });

  it('does not repeat the first step when the newest page already starts with it', async () => {
    const newest = Array.from({ length: 500 }, (_, index) => stepRow(500 - index));
    const prisma = {
      threadGenerationStep: {
        findMany: vi.fn().mockResolvedValue(newest),
        findFirst: vi.fn().mockResolvedValue(stepRow(1)),
      },
    };
    const result = await new GenerationStepsRepository(prisma as never).list('job-1');
    expect(result.map((row) => row.seq)).toEqual(Array.from({ length: 500 }, (_, i) => i + 1));
  });
});

describe('GenerationProgressService', () => {
  const role = { id: 'a', provider: 'P', model: 'm', maxOutputTokens: 1024, fallbacks: [] };
  const job = {
    id: 'job-1',
    status: 'RUNNING',
    stage: 'JUDGE',
    round: 1,
    attemptCount: 1,
    spentMicroCredits: 0n,
    spendCapMicroUsd: 1n,
    sourceThreadId: 't',
    safeErrorCode: null,
    request: {
      topic: 'x',
      publicationType: 'article',
      contentLocale: 'en',
      authors: [role],
      judge: role,
      critic: role,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns progress to the owner', async () => {
    const jobs = { findProgressJob: vi.fn().mockResolvedValue(job) };
    const steps = { list: vi.fn().mockResolvedValue([]) };
    const result = await new GenerationProgressService(jobs as never, steps as never).getProgress(
      'job-1',
      'owner-1',
    );
    expect(jobs.findProgressJob).toHaveBeenCalledWith('job-1', 'owner-1');
    expect(result.jobId).toBe('job-1');
    expect(result).not.toHaveProperty('publicationId');
  });

  it('answers 404 for another owner or a missing job, without reading steps', async () => {
    const jobs = { findProgressJob: vi.fn().mockResolvedValue(null) };
    const steps = { list: vi.fn() };
    await expect(
      new GenerationProgressService(jobs as never, steps as never).getProgress('job-1', 'other'),
    ).rejects.toThrow('Generation job not found');
    expect(steps.list).not.toHaveBeenCalled();
  });

  it('fails closed when the stored request is unreadable', async () => {
    const jobs = { findProgressJob: vi.fn().mockResolvedValue({ ...job, request: {} }) };
    await expect(
      new GenerationProgressService(jobs as never, { list: vi.fn() } as never).getProgress(
        'job-1',
        'owner-1',
      ),
    ).rejects.toThrow('Generation request is invalid');
  });
});
