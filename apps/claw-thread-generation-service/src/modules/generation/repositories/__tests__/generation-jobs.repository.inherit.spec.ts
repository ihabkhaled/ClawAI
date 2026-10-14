import { GenerationJobsRepository } from '../generation-jobs.repository';

type Reply = {
  role: string;
  round: number;
  jobId: string;
  id: string;
  createdAt: Date;
  usage: unknown;
  output: unknown;
};

function build(options: {
  child?: { status: string; attemptCount: number; evidenceBundleHash: string | null } | null;
  source?: {
    evidenceBundle: unknown;
    evidenceBundleHash: string | null;
    evidenceVersion: number | null;
  } | null;
  replies?: Reply[];
}) {
  const update = vi.fn().mockResolvedValue(undefined);
  const createMany = vi.fn().mockResolvedValue({ count: 3 });
  const findUnique = vi
    .fn()
    .mockResolvedValueOnce(
      options.child === undefined
        ? { status: 'QUEUED', attemptCount: 0, evidenceBundleHash: null }
        : options.child,
    )
    .mockResolvedValueOnce(
      options.source === undefined
        ? { evidenceBundle: { items: [] }, evidenceBundleHash: 'h', evidenceVersion: 1 }
        : options.source,
    );
  const tx = {
    threadGenerationJob: { findUnique, update },
    threadModelCommunication: {
      findMany: vi.fn().mockResolvedValue(options.replies ?? []),
      createMany,
    },
  };
  const prisma = { $transaction: (fn: (client: unknown) => unknown) => fn(tx) };
  return { repository: new GenerationJobsRepository(prisma as never), update, createMany };
}

const reply = (role: string): Reply => ({
  id: `id-${role}`,
  jobId: 'job-old',
  role,
  round: 1,
  createdAt: new Date(),
  usage: null,
  output: { ok: true },
});

describe('GenerationJobsRepository.inheritCheckpoints (ADR-181)', () => {
  it('copies the evidence and every reply except the changed roles and their consensus votes', async () => {
    const { repository, update, createMany } = build({
      replies: [
        reply('author-1'),
        reply('author-2'),
        reply('judge'),
        reply('consensus-author-author-1'),
        reply('consensus-author-author-2'),
      ],
    });

    const copied = await repository.inheritCheckpoints('job-old', 'job-new', ['author-1', 'judge']);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-new' },
        data: expect.objectContaining({ evidenceBundleHash: 'h' }),
      }),
    );
    const rows = (createMany.mock.calls[0]?.[0] as { data: Array<{ role: string; jobId: string }> })
      .data;
    expect(rows.map(({ role }) => role)).toEqual(['author-2', 'consensus-author-author-2']);
    expect(rows.every(({ jobId }) => jobId === 'job-new')).toBe(true);
    expect(createMany.mock.calls[0]?.[0]).toMatchObject({ skipDuplicates: true });
    expect(copied).toBe(3);
  });

  it('touches nothing once the child has started', async () => {
    const { repository, update, createMany } = build({
      child: { status: 'RUNNING', attemptCount: 1, evidenceBundleHash: null },
      replies: [reply('author-1')],
    });
    expect(await repository.inheritCheckpoints('job-old', 'job-new', [])).toBe(0);
    expect(update).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it('copies nothing when the failed job never finished research', async () => {
    const { repository, createMany } = build({
      source: { evidenceBundle: null, evidenceBundleHash: null, evidenceVersion: null },
      replies: [reply('author-1')],
    });
    expect(await repository.inheritCheckpoints('job-old', 'job-new', [])).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('keeps evidence the child already has and a missing child is a no-op', async () => {
    const kept = build({
      child: { status: 'QUEUED', attemptCount: 0, evidenceBundleHash: 'mine' },
    });
    await kept.repository.inheritCheckpoints('job-old', 'job-new', []);
    expect(kept.update).not.toHaveBeenCalled();
    const missing = build({ child: null });
    expect(await missing.repository.inheritCheckpoints('job-old', 'job-new', [])).toBe(0);
  });
});
