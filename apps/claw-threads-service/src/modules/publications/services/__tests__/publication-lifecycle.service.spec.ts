import { NotFoundException } from '@nestjs/common';

import { PublicationLifecycleService } from '../publication-lifecycle.service';
import type { PublicationsRepository } from '../../repositories/publications.repository';

describe('PublicationLifecycleService', () => {
  const publication = {
    id: 'pub_opaque',
    slug: 'research-note',
    title: 'Research note',
    content: { markdown: '# Research note' },
    publishedAt: new Date('2026-10-05T12:00:00.000Z'),
  };

  it('publishes only a review-ready publication owned by the caller', async () => {
    const repository = {
      publishReadyRevision: vi.fn().mockResolvedValue(publication),
    };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
    );

    await expect(service.approveAndPublish('pub_opaque', 'owner-1')).resolves.toEqual(publication);
    expect(repository.publishReadyRevision).toHaveBeenCalledWith('pub_opaque', 'owner-1');
  });

  it('does not publish another owner’s or non-ready publication', async () => {
    const repository = { publishReadyRevision: vi.fn().mockResolvedValue(null) };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
    );

    await expect(service.approveAndPublish('pub_opaque', 'owner-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps public response fields in the repository allow-list', async () => {
    const repository = {
      publishReadyRevision: vi.fn().mockResolvedValue(publication),
    };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
    );

    const result = await service.approveAndPublish('pub_opaque', 'owner-1');

    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('sourceSnapshot');
    expect(result).not.toHaveProperty('generationJobId');
  });
});
