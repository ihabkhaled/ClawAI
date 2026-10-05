import { PublicationsRepository } from '../publications.repository';

describe('PublicationsRepository', () => {
  const readyRecord = {
    id: 'pub_opaque',
    slug: 'research-note',
    revisions: [
      {
        id: 'revision-1',
        title: 'Research note',
        content: { markdown: '# Research note' },
      },
    ],
  };

  function createRepository(record: unknown, approvedCount = 1) {
    const transaction = {
      threadPublication: {
        findFirst: vi.fn().mockResolvedValue(record),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationRevision: {
        updateMany: vi.fn().mockResolvedValue({ count: approvedCount }),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    return { repository: new PublicationsRepository(prisma as never), transaction };
  }

  it('publishes an owned ready revision and returns public fields only', async () => {
    const { repository, transaction } = createRepository(readyRecord);

    const result = await repository.publishReadyRevision('pub_opaque', 'owner-1');

    expect(result).toMatchObject({
      id: 'pub_opaque',
      slug: 'research-note',
      title: 'Research note',
      content: { markdown: '# Research note' },
    });
    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('sourceSnapshot');
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledTimes(1);
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(1);
  });

  it('leaves state unchanged when the owner has no ready publication', async () => {
    const { repository, transaction } = createRepository(null);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-2')).resolves.toBeNull();
    expect(transaction.threadPublication.updateMany).not.toHaveBeenCalled();
    expect(transaction.threadPublicationRevision.updateMany).not.toHaveBeenCalled();
  });

  it('restores review state if the revision changes before approval', async () => {
    const { repository, transaction } = createRepository(readyRecord, 0);

    await expect(repository.publishReadyRevision('pub_opaque', 'owner-1')).resolves.toBeNull();
    expect(transaction.threadPublication.updateMany).toHaveBeenCalledTimes(2);
    expect(transaction.threadPublicationRevision.updateMany).toHaveBeenCalledTimes(1);
  });
});
