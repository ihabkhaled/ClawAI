import { ConflictException, NotFoundException } from '@nestjs/common';

import { PublicationGenerationOwnerService } from '../publication-generation-owner.service';

const progress = { jobId: 'job-1', status: 'FAILED' };

function setup(
  owned: { status: string; generationJobId: string | null } | null,
  jobStatus = 'FAILED',
) {
  const publications = {
    findOwnedGeneration: vi.fn().mockResolvedValue(owned ? { id: 'pub-1', ...owned } : null),
    attachRetryJob: vi.fn().mockResolvedValue(true),
    deleteOwnedUnpublished: vi.fn().mockResolvedValue(true),
  };
  const generation = {
    getProgress: vi.fn().mockResolvedValue(progress),
    getPrivateState: vi.fn().mockResolvedValue({ status: jobStatus }),
    retry: vi.fn().mockResolvedValue({ jobId: 'job-2', status: 'QUEUED' }),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  const service = new PublicationGenerationOwnerService(publications as never, generation as never);
  return { service, publications, generation };
}

const draft = { status: 'DRAFT', generationJobId: 'job-1' };

describe('PublicationGenerationOwnerService', () => {
  describe('getProgress', () => {
    it('returns the owner progress tagged with the publication id', async () => {
      const { service, generation } = setup(draft);
      await expect(service.getProgress('pub-1', 'owner-1')).resolves.toEqual({
        publicationId: 'pub-1',
        ...progress,
      });
      expect(generation.getProgress).toHaveBeenCalledWith('job-1', 'owner-1');
    });

    it.each([null, { status: 'DRAFT', generationJobId: null }])(
      'answers 404 for a non-owner or unknown publication (%j)',
      async (owned) => {
        const { service, generation } = setup(owned);
        await expect(service.getProgress('pub-1', 'intruder')).rejects.toThrow(
          new NotFoundException('Publication not found'),
        );
        expect(generation.getProgress).not.toHaveBeenCalled();
      },
    );

    it('keeps an upstream 404 as the same publication 404', async () => {
      const { service, generation } = setup(draft);
      generation.getProgress.mockRejectedValue(new NotFoundException('Generation job not found'));
      await expect(service.getProgress('pub-1', 'owner-1')).rejects.toThrow(
        new NotFoundException('Publication not found'),
      );
    });

    it('passes other upstream failures through', async () => {
      const { service, generation } = setup(draft);
      const failure = new Error('boom');
      generation.getProgress.mockRejectedValue(failure);
      await expect(service.getProgress('pub-1', 'owner-1')).rejects.toBe(failure);
    });
  });

  describe('retry', () => {
    const input = { idempotencyKey: 'retry-1', spendCapUsd: 2 };

    it.each(['FAILED', 'CANCELLED'])(
      'starts a new job from a %s one and attaches it',
      async (jobStatus) => {
        const { service, generation, publications } = setup(draft, jobStatus);
        await expect(service.retry('pub-1', 'owner-1', input)).resolves.toEqual({
          publicationId: 'pub-1',
          jobId: 'job-2',
          status: 'QUEUED',
        });
        expect(generation.retry).toHaveBeenCalledWith('job-1', 'owner-1', input);
        expect(publications.attachRetryJob).toHaveBeenCalledWith(
          'pub-1',
          'owner-1',
          'job-1',
          'job-2',
        );
      },
    );

    it('answers 404 to a non-owner', async () => {
      const { service, generation } = setup(null);
      await expect(service.retry('pub-1', 'intruder', input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(generation.retry).not.toHaveBeenCalled();
    });

    it.each(['PUBLISHED', 'UNPUBLISHED', 'READY_FOR_REVIEW'])(
      'refuses a %s publication with 409',
      async (status) => {
        const { service, generation } = setup({ status, generationJobId: 'job-1' });
        await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(generation.retry).not.toHaveBeenCalled();
      },
    );

    it.each(['QUEUED', 'RUNNING', 'WAITING_FOR_REVIEW', 'COMPLETED'])(
      'refuses a retry while the job is %s',
      async (jobStatus) => {
        const { service, generation } = setup(draft, jobStatus);
        await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(generation.retry).not.toHaveBeenCalled();
      },
    );

    it('reports 409 when the publication moved before the new job was attached', async () => {
      const { service, publications } = setup(draft);
      publications.attachRetryJob.mockResolvedValue(false);
      await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('retry lost race', () => {
    const input = { idempotencyKey: 'retry-1', spendCapUsd: 2 };

    it('cancels the new job before answering 409', async () => {
      const { service, publications, generation } = setup(draft);
      publications.attachRetryJob.mockResolvedValue(false);
      await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(generation.cancel).toHaveBeenCalledWith('job-2');
    });

    it('still answers 409 when the cancel itself fails', async () => {
      const { service, publications, generation } = setup(draft);
      publications.attachRetryJob.mockResolvedValue(false);
      generation.cancel.mockRejectedValue(new Error('down'));
      await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('returns the existing job and does not cancel on a same-key replay', async () => {
      const { service, publications, generation } = setup(draft);
      publications.attachRetryJob.mockResolvedValue(false);
      publications.findOwnedGeneration
        .mockResolvedValueOnce({ id: 'pub-1', ...draft })
        .mockResolvedValueOnce({ id: 'pub-1', status: 'DRAFT', generationJobId: 'job-2' });
      await expect(service.retry('pub-1', 'owner-1', input)).resolves.toEqual({
        publicationId: 'pub-1',
        jobId: 'job-2',
        status: 'QUEUED',
      });
      expect(generation.cancel).not.toHaveBeenCalled();
    });

    it('does not cancel anything when the attach succeeds', async () => {
      const { service, generation } = setup(draft);
      await service.retry('pub-1', 'owner-1', input);
      expect(generation.cancel).not.toHaveBeenCalled();
    });
  });

  describe('delete when the upstream job is already gone', () => {
    it('still removes the row when getPrivateState is 404', async () => {
      const { service, generation, publications } = setup(draft);
      generation.getPrivateState.mockRejectedValue(new NotFoundException());
      await expect(service.delete('pub-1', 'owner-1')).resolves.toEqual({ deleted: true });
      expect(generation.deleteJob).not.toHaveBeenCalled();
      expect(publications.deleteOwnedUnpublished).toHaveBeenCalledWith('pub-1', 'owner-1');
    });

    it('still removes the row when deleteJob is 404', async () => {
      const { service, generation, publications } = setup(draft);
      generation.deleteJob.mockRejectedValue(new NotFoundException());
      await expect(service.delete('pub-1', 'owner-1')).resolves.toEqual({ deleted: true });
      expect(publications.deleteOwnedUnpublished).toHaveBeenCalled();
    });

    it('passes other upstream failures through and keeps the row', async () => {
      const { service, generation, publications } = setup(draft);
      const failure = new Error('boom');
      generation.deleteJob.mockRejectedValue(failure);
      await expect(service.delete('pub-1', 'owner-1')).rejects.toBe(failure);
      expect(publications.deleteOwnedUnpublished).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it.each(['FAILED', 'CANCELLED', 'WAITING_FOR_REVIEW', 'COMPLETED'])(
      'deletes the job and the publication when the job is %s',
      async (jobStatus) => {
        const { service, generation, publications } = setup(draft, jobStatus);
        await expect(service.delete('pub-1', 'owner-1')).resolves.toEqual({ deleted: true });
        expect(generation.deleteJob).toHaveBeenCalledWith('job-1', 'owner-1');
        expect(publications.deleteOwnedUnpublished).toHaveBeenCalledWith('pub-1', 'owner-1');
      },
    );

    it('answers 404 to a non-owner and deletes nothing', async () => {
      const { service, generation, publications } = setup(null);
      await expect(service.delete('pub-1', 'intruder')).rejects.toBeInstanceOf(NotFoundException);
      expect(generation.deleteJob).not.toHaveBeenCalled();
      expect(publications.deleteOwnedUnpublished).not.toHaveBeenCalled();
    });

    it.each(['PUBLISHED', 'REVOKED'])('refuses to delete a %s publication', async (status) => {
      const { service, generation, publications } = setup({ status, generationJobId: 'job-1' });
      await expect(service.delete('pub-1', 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(generation.deleteJob).not.toHaveBeenCalled();
      expect(publications.deleteOwnedUnpublished).not.toHaveBeenCalled();
    });

    it.each(['DRAFT', 'READY_FOR_REVIEW', 'UNPUBLISHED'])(
      'allows deleting a %s publication',
      async (status) => {
        const { service } = setup({ status, generationJobId: 'job-1' });
        await expect(service.delete('pub-1', 'owner-1')).resolves.toEqual({ deleted: true });
      },
    );

    it.each(['QUEUED', 'RUNNING'])('refuses to delete while the job is %s', async (jobStatus) => {
      const { service, generation } = setup(draft, jobStatus);
      await expect(service.delete('pub-1', 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(generation.deleteJob).not.toHaveBeenCalled();
    });

    it('reports 409 when the row changed before it could be removed', async () => {
      const { service, publications } = setup(draft);
      publications.deleteOwnedUnpublished.mockResolvedValue(false);
      await expect(service.delete('pub-1', 'owner-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
