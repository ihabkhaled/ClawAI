import { PublicationChangeRequestsRepository } from '../publication-change-requests.repository';

function create() {
  const prisma = {
    threadPublication: { findFirst: vi.fn() },
    threadPublicationChangeRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    threadPublicationRevision: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma, repository: new PublicationChangeRequestsRepository(prisma as never) };
}

describe('PublicationChangeRequestsRepository', () => {
  it('lists an owner their suggestions only when they own the publication', async () => {
    const { prisma, repository } = create();
    prisma.threadPublication.findFirst.mockResolvedValue(null);
    await expect(repository.findForOwner('pub-1', 'intruder')).resolves.toBeNull();
    expect(prisma.threadPublication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pub-1', ownerId: 'intruder' } }),
    );
    expect(prisma.threadPublicationChangeRequest.findMany).not.toHaveBeenCalled();
  });

  it('only ever selects ACCEPTED and APPLIED suggestions for the public credit line', async () => {
    const { prisma, repository } = create();
    prisma.threadPublication.findFirst.mockResolvedValue({ id: 'pub-1' });
    prisma.threadPublicationChangeRequest.findMany.mockResolvedValue([
      { requesterId: 'a' },
      { requesterId: 'a' },
      { requesterId: 'b' },
    ]);

    await expect(repository.findPublicCreditIds('slug')).resolves.toEqual(['a', 'b']);

    const where = prisma.threadPublicationChangeRequest.findMany.mock.calls[0]?.[0].where;
    expect(where.status).toEqual({ in: ['ACCEPTED', 'APPLIED'] });
    expect(JSON.stringify(where)).not.toContain('PENDING');
    expect(JSON.stringify(where)).not.toContain('REJECTED');
  });

  it('returns null credits for a Thread that is not public', async () => {
    const { prisma, repository } = create();
    prisma.threadPublication.findFirst.mockResolvedValue(null);
    await expect(repository.findPublicCreditIds('slug')).resolves.toBeNull();
  });

  it('tells a non-owner nothing: no id, no count, no count query', async () => {
    const { prisma, repository } = create();
    prisma.threadPublication.findFirst.mockResolvedValue(null);
    await expect(repository.findViewerOwnership('slug', 'visitor')).resolves.toEqual({
      isOwner: false,
    });
    expect(prisma.threadPublicationChangeRequest.count).not.toHaveBeenCalled();
    expect(prisma.threadPublication.findFirst.mock.calls[0]?.[0].where.ownerId).toBe('visitor');
  });

  it('counts only PENDING suggestions for the owner of a public Thread', async () => {
    const { prisma, repository } = create();
    prisma.threadPublication.findFirst.mockResolvedValue({ id: 'pub-1' });
    prisma.threadPublicationChangeRequest.count.mockResolvedValue(4);
    await expect(repository.findViewerOwnership('slug', 'owner')).resolves.toEqual({
      isOwner: true,
      publicationId: 'pub-1',
      pendingChangeRequests: 4,
    });
    expect(prisma.threadPublicationChangeRequest.count).toHaveBeenCalledWith({
      where: { publicationId: 'pub-1', status: 'PENDING' },
    });
  });

  it('shows a person only their own suggestions, with a real title for an old placeholder', async () => {
    const { prisma, repository } = create();
    prisma.threadPublicationChangeRequest.findMany.mockResolvedValue([
      {
        id: 'r1',
        suggestion: 's',
        status: 'REJECTED',
        ownerResponse: 'Out of scope',
        createdAt: new Date(),
        updatedAt: new Date(),
        publication: {
          slug: 'plants-1',
          status: 'PUBLISHED',
          revisions: [{ title: 'Untitled draft', content: { markdown: '# Plants\n\nText' } }],
        },
      },
    ]);
    const rows = await repository.findMine('asker');
    expect(prisma.threadPublicationChangeRequest.findMany.mock.calls[0]?.[0].where).toEqual({
      requesterId: 'asker',
    });
    expect(rows[0]?.thread).toEqual({ slug: 'plants-1', title: 'Plants', isPublic: true });
  });

  describe('markAcceptedApplied', () => {
    const earlier = new Date('2026-10-15T10:00:00Z');
    const later = new Date('2026-10-15T11:00:00Z');

    it('applies nothing when no revision is live', async () => {
      const { prisma, repository } = create();
      prisma.threadPublicationRevision.findFirst.mockResolvedValue(null);
      await expect(repository.markAcceptedApplied('pub-1')).resolves.toEqual([]);
      expect(prisma.threadPublicationChangeRequest.updateMany).not.toHaveBeenCalled();
    });

    it('applies a request accepted with a revision once that revision (or newer) is live', async () => {
      const { prisma, repository } = create();
      prisma.threadPublicationRevision.findFirst.mockResolvedValue({
        revision: 3,
        createdAt: later,
      });
      prisma.threadPublicationChangeRequest.findMany.mockResolvedValue([
        { id: 'ok', acceptedRevisionId: 'rev-2', updatedAt: earlier },
        { id: 'not-yet', acceptedRevisionId: 'rev-4', updatedAt: earlier },
      ]);
      prisma.threadPublicationRevision.findMany.mockResolvedValue([
        { id: 'rev-2', revision: 2 },
        { id: 'rev-4', revision: 4 },
      ]);

      await expect(repository.markAcceptedApplied('pub-1')).resolves.toEqual(['ok']);
      expect(prisma.threadPublicationChangeRequest.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ok'] }, publicationId: 'pub-1', status: 'ACCEPTED' },
        data: { status: 'APPLIED' },
      });
    });

    it('applies a self-edited request only when the live revision is newer than the acceptance', async () => {
      const { prisma, repository } = create();
      prisma.threadPublicationRevision.findFirst.mockResolvedValue({
        revision: 2,
        createdAt: later,
      });
      prisma.threadPublicationChangeRequest.findMany.mockResolvedValue([
        { id: 'edited-after', acceptedRevisionId: null, updatedAt: earlier },
        {
          id: 'accepted-after-live',
          acceptedRevisionId: null,
          updatedAt: new Date('2026-10-15T12:00:00Z'),
        },
      ]);
      await expect(repository.markAcceptedApplied('pub-1')).resolves.toEqual(['edited-after']);
    });

    it('moves only ACCEPTED rows, so a declined or pending request can never become APPLIED', async () => {
      const { prisma, repository } = create();
      prisma.threadPublicationRevision.findFirst.mockResolvedValue({
        revision: 2,
        createdAt: later,
      });
      prisma.threadPublicationChangeRequest.findMany.mockResolvedValue([]);
      await repository.markAcceptedApplied('pub-1');
      expect(prisma.threadPublicationChangeRequest.findMany.mock.calls[0]?.[0].where).toEqual({
        publicationId: 'pub-1',
        status: 'ACCEPTED',
      });
    });
  });

  it('builds a decision context with the readable title', async () => {
    const { prisma, repository } = create();
    prisma.threadPublicationChangeRequest.findUnique.mockResolvedValue({
      id: 'r1',
      requesterId: 'asker',
      suggestion: 's',
      status: 'ACCEPTED',
      publication: {
        id: 'pub-1',
        slug: 'plants-1',
        ownerId: 'owner',
        revisions: [{ title: 'Plants', content: {} }],
      },
    });
    await expect(repository.findDecisionContext('r1')).resolves.toMatchObject({
      requestId: 'r1',
      requesterId: 'asker',
      publication: { id: 'pub-1', title: 'Plants' },
    });
  });
});
