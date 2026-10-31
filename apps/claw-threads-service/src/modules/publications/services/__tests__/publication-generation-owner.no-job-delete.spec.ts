import { ConflictException, NotFoundException } from '@nestjs/common';

import { PublicationGenerationState, PublicationStatus } from '../../../../generated/prisma';
import { canOwnerDelete } from '../../utilities/owner-page-status.utility';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationGenerationOwnerService } from '../publication-generation-owner.service';

function setup(owned: { status: PublicationStatus; generationJobId: string | null } | null) {
  const publications = {
    findOwnedGeneration: vi
      .fn()
      .mockResolvedValue(owned ? { id: 'p', ownerId: 'o', ...owned } : null),
    deleteOwnedUnpublished: vi.fn().mockResolvedValue(true),
  };
  const generation = { getPrivateState: vi.fn(), deleteJob: vi.fn() };
  const service = new PublicationGenerationOwnerService(
    publications as never,
    generation as never,
    {} as never,
    {} as never,
    new GenerationStartGate(),
  );
  return { service, publications, generation };
}

describe('delete of a publication that has no generation job', () => {
  it.each([
    PublicationStatus.DRAFT,
    PublicationStatus.READY_FOR_REVIEW,
    PublicationStatus.UNPUBLISHED,
  ])('deletes a %s row without touching the generation service', async (status) => {
    const { service, publications, generation } = setup({ status, generationJobId: null });
    await expect(service.delete('p', 'o')).resolves.toEqual({ deleted: true });
    expect(generation.getPrivateState).not.toHaveBeenCalled();
    expect(generation.deleteJob).not.toHaveBeenCalled();
    expect(publications.deleteOwnedUnpublished).toHaveBeenCalledWith('p', 'o');
  });

  it('still answers 409 for a published row and 404 for a stranger or a second delete', async () => {
    await expect(
      setup({ status: PublicationStatus.PUBLISHED, generationJobId: null }).service.delete(
        'p',
        'o',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(setup(null).service.delete('p', 'stranger')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports a lost race as 409, never as success', async () => {
    const { service, publications } = setup({
      status: PublicationStatus.DRAFT,
      generationJobId: null,
    });
    publications.deleteOwnedUnpublished.mockResolvedValue(false);
    await expect(service.delete('p', 'o')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('list canDelete parity for a row with no job', () => {
  const row = (status: PublicationStatus) => ({
    status,
    generationState: null,
    generationFailureCode: null,
    generationFailureStep: null,
    generationFailureRetryable: null,
  });

  it.each(Object.values(PublicationStatus))(
    '%s: canDelete equals the real delete answer',
    async (status) => {
      const { service } = setup({ status, generationJobId: null });
      const real = await service.delete('p', 'o').then(
        () => true,
        () => false,
      );
      expect(canOwnerDelete(row(status), false)).toBe(real);
    },
  );

  it('a DRAFT with an unread job is still not deletable', () => {
    expect(canOwnerDelete({ ...row(PublicationStatus.DRAFT) }, true)).toBe(false);
    expect(
      canOwnerDelete({
        ...row(PublicationStatus.DRAFT),
        generationState: PublicationGenerationState.FAILED,
      }),
    ).toBe(true);
  });
});
