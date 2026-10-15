import { NotFoundException } from '@nestjs/common';

import { PublicationChangeRequestViewsService } from '../publication-change-request-views.service';

function create() {
  const requests = {
    findForOwner: vi.fn(),
    findMine: vi.fn(),
    findViewerOwnership: vi.fn(),
    findPublicCreditIds: vi.fn(),
  };
  const identity = { resolveMany: vi.fn().mockResolvedValue(new Map()) };
  const service = new PublicationChangeRequestViewsService(requests as never, identity as never);
  return { service, requests, identity };
}

const record = {
  id: 'r1',
  suggestion: 'Add a section on chlorophyll',
  status: 'PENDING',
  ownerResponse: null,
  acceptedRevisionId: null,
  createdAt: new Date('2026-10-15T00:00:00Z'),
  requesterId: 'asker',
};

describe('PublicationChangeRequestViewsService', () => {
  it('lists suggestions for the owner with the requester name and no user id', async () => {
    const { service, requests, identity } = create();
    requests.findForOwner.mockResolvedValue([record, { ...record, id: 'r2', requesterId: null }]);
    identity.resolveMany.mockResolvedValue(
      new Map([['asker', { displayName: 'Chen Charlie', username: 'qa8_c' }]]),
    );

    const rows = await service.listForOwner('pub-1', 'owner');

    expect(requests.findForOwner).toHaveBeenCalledWith('pub-1', 'owner');
    expect(rows[0]).toMatchObject({
      id: 'r1',
      requester: { displayName: 'Chen Charlie', username: 'qa8_c' },
    });
    expect(rows[1]?.requester).toBeNull();
    expect(JSON.stringify(rows)).not.toContain('requesterId');
  });

  it('answers 404 for a publication the caller does not own (no IDOR)', async () => {
    const { service, requests } = create();
    requests.findForOwner.mockResolvedValue(null);
    await expect(service.listForOwner('pub-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('gives a visitor without a token nothing but isOwner false, and never queries', async () => {
    const { service, requests } = create();
    await expect(service.viewerOwnership('slug', undefined)).resolves.toEqual({ isOwner: false });
    expect(requests.findViewerOwnership).not.toHaveBeenCalled();
  });

  it('passes the signed-in viewer to the ownership lookup', async () => {
    const { service, requests } = create();
    requests.findViewerOwnership.mockResolvedValue({
      isOwner: true,
      publicationId: 'pub-1',
      pendingChangeRequests: 2,
    });
    await expect(service.viewerOwnership('slug', 'owner')).resolves.toEqual({
      isOwner: true,
      publicationId: 'pub-1',
      pendingChangeRequests: 2,
    });
    expect(requests.findViewerOwnership).toHaveBeenCalledWith('slug', 'owner');
  });

  it('credits names only, in order, skipping people who can no longer be resolved', async () => {
    const { service, requests, identity } = create();
    requests.findPublicCreditIds.mockResolvedValue(['a', 'gone', 'b']);
    identity.resolveMany.mockResolvedValue(
      new Map([
        ['a', { displayName: 'Ann', username: 'ann' }],
        ['b', { displayName: 'Bo', username: 'bo' }],
      ]),
    );
    const credits = await service.listCredits('slug');
    expect(credits).toEqual([
      { displayName: 'Ann', username: 'ann' },
      { displayName: 'Bo', username: 'bo' },
    ]);
  });

  it('answers 404 for the credits of a Thread that is not public', async () => {
    const { service, requests } = create();
    requests.findPublicCreditIds.mockResolvedValue(null);
    await expect(service.listCredits('slug')).rejects.toBeInstanceOf(NotFoundException);
  });
});
