import { PublicationRevokeRepository } from '../repositories/publication-revoke.repository';

describe('PublicationRevokeRepository', () => {
  function create(status: string | null) {
    const tx = {
      threadPublication: {
        findUnique: vi.fn().mockResolvedValue(status ? { status } : null),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      threadPublicationReport: {
        findFirst: vi.fn().mockResolvedValue({ publicationId: 'p1', commentId: null }),
      },
    };
    return { repo: new PublicationRevokeRepository(prisma as never), tx, prisma };
  }

  it('sets REVOKED on a published row', async () => {
    const { repo, tx } = create('PUBLISHED');
    await expect(repo.revoke('p1')).resolves.toBe('REVOKED');
    expect(tx.threadPublication.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'REVOKED' },
    });
  });

  it('writes nothing for an already revoked row', async () => {
    const { repo, tx } = create('REVOKED');
    await expect(repo.revoke('p1')).resolves.toBe('ALREADY_REVOKED');
    expect(tx.threadPublication.update).not.toHaveBeenCalled();
  });

  it('reports NOT_FOUND', async () => {
    const { repo } = create(null);
    await expect(repo.revoke('x')).resolves.toBe('NOT_FOUND');
  });

  it('finds only open report targets', async () => {
    const { repo, prisma } = create('PUBLISHED');
    await repo.findOpenReportTarget('r1');
    expect(prisma.threadPublicationReport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1', status: 'OPEN' } }),
    );
  });
});
