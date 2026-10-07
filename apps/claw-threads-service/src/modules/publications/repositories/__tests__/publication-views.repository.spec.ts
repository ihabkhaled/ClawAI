import { PublicationViewsRepository } from '../publication-views.repository';

const WINDOW = new Date('2026-10-07T10:00:00.000Z');

function build(overrides: { repeat?: boolean; newReader?: boolean; found?: boolean } = {}) {
  const found = overrides.found ?? true;
  const tx = {
    threadPublication: {
      findFirst: vi
        .fn()
        .mockResolvedValue(found ? { id: 'pub-1', viewCount: 9, readerCount: 3 } : null),
      update: vi
        .fn()
        .mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
          'viewCount' in data ? { viewCount: 10 } : { readerCount: 4 },
        ),
    },
    threadPublicationView: {
      findFirst: vi.fn().mockResolvedValue(overrides.repeat ? { id: 'v1' } : null),
      create: vi.fn().mockResolvedValue({}),
    },
    threadPublicationReader: {
      createMany: vi.fn().mockResolvedValue({ count: overrides.newReader === false ? 0 : 1 }),
    },
  };
  const prisma = {
    ...tx,
    $transaction: vi.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
  return { tx, repository: new PublicationViewsRepository(prisma as never) };
}

const input = { slug: 'slug', viewerHash: 'v'.repeat(64), readerHash: null, windowStart: WINDOW };

describe('PublicationViewsRepository', () => {
  it('only counts a publication that is public', async () => {
    const { repository, tx } = build({ found: false });

    await expect(repository.recordView(input)).resolves.toBeNull();
    expect(tx.threadPublicationView.create).not.toHaveBeenCalled();
    expect(tx.threadPublication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'slug',
          status: 'PUBLISHED',
          revisions: {
            some: {
              reviewStatus: 'OWNER_APPROVED',
              safetyStatus: 'APPROVED',
              indexEligible: true,
            },
          },
        }),
      }),
    );
  });

  it('records a new view and raises the counter', async () => {
    const { repository, tx } = build();

    await expect(repository.recordView(input)).resolves.toEqual({ viewCount: 10, readerCount: 3 });
    expect(tx.threadPublicationView.create).toHaveBeenCalledWith({
      data: { publicationId: 'pub-1', viewerHash: input.viewerHash },
    });
  });

  it('does not count a repeat inside the window', async () => {
    const { repository, tx } = build({ repeat: true });

    await expect(repository.recordView(input)).resolves.toEqual({ viewCount: 9, readerCount: 3 });
    expect(tx.threadPublicationView.create).not.toHaveBeenCalled();
    expect(tx.threadPublicationView.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdAt: { gte: WINDOW } }),
      }),
    );
  });

  it('counts a first-time signed-in reader once, and a returning one not at all', async () => {
    const first = build();
    await expect(
      first.repository.recordView({ ...input, readerHash: 'r'.repeat(64) }),
    ).resolves.toEqual({ viewCount: 10, readerCount: 4 });

    const again = build({ newReader: false });
    await expect(
      again.repository.recordView({ ...input, readerHash: 'r'.repeat(64) }),
    ).resolves.toEqual({ viewCount: 10, readerCount: 3 });
    expect(again.tx.threadPublicationReader.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });
});
