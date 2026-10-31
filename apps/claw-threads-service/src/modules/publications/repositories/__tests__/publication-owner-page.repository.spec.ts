import { PublicationGenerationState, PublicationStatus } from '../../../../generated/prisma';
import { PUBLISHABLE_REVISION_WHERE } from '../../constants/publication-publish.constants';
import { PublicationOwnerPageRepository } from '../publication-owner-page.repository';

const created = new Date('2026-10-30T10:00:00Z');

function publication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    status: PublicationStatus.DRAFT,
    slug: 'slug-1',
    createdAt: created,
    updatedAt: created,
    publishedAt: null,
    generationState: null,
    generationFailureCode: null,
    generationFailureStep: null,
    generationFailureRetryable: null,
    revisions: [],
    ...overrides,
  };
}

function setup() {
  const prisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
    threadPublication: { findMany: vi.fn().mockResolvedValue([]) },
    threadPublicationRevision: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { repository: new PublicationOwnerPageRepository(prisma as never), prisma };
}

describe('PublicationOwnerPageRepository.findPageIds', () => {
  it('runs the page and the COUNT as two queries and returns ids and total', async () => {
    const { repository, prisma } = setup();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([{ total: 42 }]);
    await expect(repository.findPageIds({ ownerId: 'o', status: 'ALL' }, 10, 0)).resolves.toEqual({
      ids: ['a', 'b'],
      total: 42,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('answers total 0 when the count returns nothing', async () => {
    const { repository, prisma } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(repository.findPageIds({ ownerId: 'o', status: 'ALL' }, 10, 0)).resolves.toEqual({
      ids: [],
      total: 0,
    });
  });
});

describe('PublicationOwnerPageRepository.hydrate', () => {
  it('does no query for an empty page', async () => {
    const { repository, prisma } = setup();
    await expect(repository.hydrate('o', [])).resolves.toEqual([]);
    expect(prisma.threadPublication.findMany).not.toHaveBeenCalled();
  });

  it('reads the whole page in a fixed number of queries and scopes them to the owner', async () => {
    const { repository, prisma } = setup();
    const ids = Array.from({ length: 10 }, (_value, index) => `p${String(index)}`);
    prisma.threadPublication.findMany.mockResolvedValue(ids.map((id) => publication({ id })));
    await repository.hydrate('owner-1', ids);
    expect(prisma.threadPublication.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.threadPublication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ids }, ownerId: 'owner-1' } }),
    );
    expect(prisma.threadPublicationRevision.findMany).toHaveBeenCalledTimes(1);
  });

  it('keeps the order of the ids and drops an id that is not the owner', async () => {
    const { repository, prisma } = setup();
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({ id: 'b' }),
      publication({ id: 'a' }),
    ]);
    const items = await repository.hydrate('o', ['a', 'x', 'b']);
    expect(items.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('reuses the publish revision predicate for canPublish', async () => {
    const { repository, prisma } = setup();
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({ id: 'r1', status: PublicationStatus.READY_FOR_REVIEW }),
      publication({ id: 'r2', status: PublicationStatus.READY_FOR_REVIEW }),
    ]);
    prisma.threadPublicationRevision.findMany.mockImplementation(
      (args: { where: Record<string, unknown> }) => {
        expect(args.where).toMatchObject(PUBLISHABLE_REVISION_WHERE);
        return Promise.resolve(args.where.title ? [] : [{ publicationId: 'r1' }]);
      },
    );
    const items = await repository.hydrate('o', ['r1', 'r2']);
    expect(items.map((item) => item.canPublish)).toEqual([true, false]);
  });

  it('shapes a running, failed, ready and published row', async () => {
    const { repository, prisma } = setup();
    const published = new Date('2026-10-31T00:00:00Z');
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({ id: 'run' }),
      publication({
        id: 'bad',
        generationState: PublicationGenerationState.FAILED,
        generationFailureCode: 'PROVIDER_ERROR',
        generationFailureStep: 'RESEARCH',
        generationFailureRetryable: true,
      }),
      publication({
        id: 'rdy',
        status: PublicationStatus.READY_FOR_REVIEW,
        revisions: [
          {
            title: 'Ready title',
            reviewStatus: 'READY_FOR_REVIEW',
            safetyStatus: 'APPROVED',
            indexEligible: true,
          },
        ],
      }),
      publication({ id: 'pub', status: PublicationStatus.PUBLISHED, publishedAt: published }),
    ]);
    const items = await repository.hydrate('o', ['run', 'bad', 'rdy', 'pub']);
    expect(items.map((item) => [item.id, item.status, item.canDelete])).toEqual([
      ['run', 'GENERATING', false],
      ['bad', 'FAILED', true],
      ['rdy', 'READY', true],
      ['pub', 'PUBLISHED', false],
    ]);
    expect(items[1]?.failure).toEqual({
      code: 'PROVIDER_ERROR',
      retryable: true,
      step: 'RESEARCH',
    });
    expect(items[2]?.title).toBe('Ready title');
    expect(items[0]?.title).toBeNull();
    expect(items[3]?.publishedAt).toBe(published);
  });

  it('exposes the slug only for a live article', async () => {
    const { repository, prisma } = setup();
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({ id: 'live', status: PublicationStatus.PUBLISHED }),
      publication({ id: 'draft' }),
    ]);
    const items = await repository.hydrate('o', ['live', 'draft']);
    expect(items.map((item) => item.slug)).toEqual(['slug-1', null]);
  });

  it('shows the approved title while a newer revision is held back, like the old list', async () => {
    const { repository, prisma } = setup();
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({
        id: 'p',
        status: PublicationStatus.PUBLISHED,
        revisions: [
          {
            title: 'Edit in review',
            reviewStatus: 'PENDING',
            safetyStatus: 'APPROVED',
            indexEligible: false,
          },
          {
            title: 'Live title',
            reviewStatus: 'OWNER_APPROVED',
            safetyStatus: 'APPROVED',
            indexEligible: true,
          },
        ],
      }),
    ]);
    const [item] = await repository.hydrate('o', ['p']);
    expect(item?.title).toBe('Live title');
  });
});

describe('PublicationOwnerPageRepository state bookkeeping', () => {
  it('looks for unresolved drafts of one owner only, bounded by a limit', async () => {
    const { repository, prisma } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    const stale = new Date();
    await repository.findUnresolved('owner-1', stale, 20);
    const sql = prisma.$queryRaw.mock.calls[0]?.[0] as { text: string; values: unknown[] };
    expect(sql.text).toContain('"owner_id" = $1');
    expect(sql.text).toContain(`"status" = 'DRAFT'`);
    expect(sql.text).toContain('LIMIT');
    expect(sql.values).toEqual(['owner-1', stale, 20]);
  });

  it('records the state guarded by the job id, without touching updated_at', async () => {
    const { repository, prisma } = setup();
    const ok = await repository.recordState('p1', 'job-1', {
      state: PublicationGenerationState.FAILED,
      failureCode: 'X_CODE',
      failureStep: 'RESEARCH',
      failureRetryable: true,
    });
    expect(ok).toBe(true);
    const sql = prisma.$executeRaw.mock.calls[0]?.[0] as { text: string; values: unknown[] };
    expect(sql.text).toContain('"generation_job_id" = ');
    expect(sql.text).not.toContain('updated_at');
    expect(sql.values).toContain('job-1');
  });

  it('reports false when the job was replaced meanwhile', async () => {
    const { repository, prisma } = setup();
    prisma.$executeRaw.mockResolvedValue(0);
    await expect(
      repository.recordState('p1', 'old', {
        state: PublicationGenerationState.DONE,
        failureCode: null,
        failureStep: null,
        failureRetryable: null,
      }),
    ).resolves.toBe(false);
  });
});

describe('PublicationOwnerPageRepository.hydrate without a job', () => {
  it('offers delete for a draft with no generation job', async () => {
    const { repository, prisma } = setup();
    prisma.threadPublication.findMany.mockResolvedValue([
      publication({ id: 'nojob', generationJobId: null }),
      publication({ id: 'job', generationJobId: 'j1' }),
    ]);
    const items = await repository.hydrate('o', ['nojob', 'job']);
    expect(items.map((item) => item.canDelete)).toEqual([true, false]);
  });
});
