import { NotFoundException } from '@nestjs/common';

import { PublicationRevokeService } from '../services/publication-revoke.service';

describe('PublicationRevokeService', () => {
  function create(outcome: 'REVOKED' | 'ALREADY_REVOKED' | 'NOT_FOUND', withPort = true) {
    const repository = {
      revoke: vi.fn().mockResolvedValue(outcome),
      findOpenReportTarget: vi.fn(),
    };
    const port = { removePublication: vi.fn().mockResolvedValue(undefined) };
    const service = new PublicationRevokeService(repository as never, withPort ? port : undefined);
    return { service, repository, port };
  }

  it('revokes and removes the search row', async () => {
    const { service, port } = create('REVOKED');
    await expect(service.revoke('p1', 'mod-1', 'spam')).resolves.toEqual({
      revoked: true,
      alreadyRevoked: false,
    });
    expect(port.removePublication).toHaveBeenCalledWith('p1');
  });

  it('is idempotent and still re-runs the index removal', async () => {
    const { service, port } = create('ALREADY_REVOKED');
    await expect(service.revoke('p1', 'mod-1', undefined)).resolves.toEqual({
      revoked: true,
      alreadyRevoked: true,
    });
    expect(port.removePublication).toHaveBeenCalledTimes(1);
  });

  it('answers 404 for an unknown publication and skips the index', async () => {
    const { service, port } = create('NOT_FOUND');
    await expect(service.revoke('nope', 'mod-1', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(port.removePublication).not.toHaveBeenCalled();
  });

  it('works with no Board index bound', async () => {
    const { service } = create('REVOKED', false);
    await expect(service.revoke('p1', 'mod-1', undefined)).resolves.toMatchObject({
      revoked: true,
    });
  });

  it('does not fail the revoke when the index throws', async () => {
    const { service, port } = create('REVOKED');
    port.removePublication.mockRejectedValue(new Error('db down'));
    await expect(service.revoke('p1', 'mod-1', undefined)).resolves.toMatchObject({
      revoked: true,
    });
  });
});
