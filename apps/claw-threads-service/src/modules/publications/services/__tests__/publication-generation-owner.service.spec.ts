import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

import { scopedIdempotencyKey } from '../../utilities/generation-idempotency.utility';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationGenerationOwnerService } from '../publication-generation-owner.service';

const selections = {
  spendCapMicroUsd: '2000000',
  roles: [
    {
      roleId: 'author-1',
      roleKind: 'AUTHOR',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      fallbacks: [{ provider: 'OPENAI', model: 'gpt-5-mini' }],
    },
  ],
};
const progress = { jobId: 'job-1', status: 'FAILED', selections };

function setup(
  owned: { status: string; generationJobId: string | null } | null,
  jobStatus = 'FAILED',
) {
  const publications = {
    findOwnedGeneration: vi.fn().mockResolvedValue(owned ? { id: 'pub-1', ...owned } : null),
    attachRetryJob: vi.fn().mockResolvedValue(true),
    findByGenerationJobId: vi.fn().mockResolvedValue(null),
    deleteOwnedUnpublished: vi.fn().mockResolvedValue(true),
  };
  const generation = {
    getProgress: vi.fn().mockResolvedValue(progress),
    getPrivateState: vi.fn().mockResolvedValue({ status: jobStatus }),
    retry: vi.fn().mockResolvedValue({ jobId: 'job-2', status: 'QUEUED' }),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  const preflight = {
    assertCanRetry: vi.fn().mockResolvedValue(undefined),
    explainBudgetDenial: vi.fn().mockResolvedValue(null),
  };
  const activeCap = { assertBelowCap: vi.fn().mockResolvedValue(undefined) };
  const service = new PublicationGenerationOwnerService(
    publications as never,
    generation as never,
    preflight as never,
    activeCap as never,
    new GenerationStartGate(),
  );
  return { service, publications, generation, preflight, activeCap };
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
        expect(generation.retry).toHaveBeenCalledWith('job-1', 'owner-1', {
          ...input,
          idempotencyKey: scopedIdempotencyKey('owner-1', 'retry-1'),
        });
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

describe('PublicationGenerationOwnerService retry preflight (ADR-176)', () => {
  const input = {
    idempotencyKey: 'retry-1',
    models: [{ roleId: 'author-1', provider: 'GEMINI', model: 'gemini-nope-9' }],
  };

  it('runs the start preflight on the stored seats and the requested models before any job exists', async () => {
    const { service, preflight, generation } = setup(draft);

    await service.retry('pub-1', 'owner-1', input);

    expect(preflight.assertCanRetry).toHaveBeenCalledWith('owner-1', selections, input);
    expect(generation.retry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an unknown model', new BadRequestException('unknown')],
    ['a model the plan excludes', new ForbiddenException('plan')],
    ['a spend cap below the floor', new BadRequestException('cap')],
  ])('creates no job when the preflight refuses %s', async (_name, refusal) => {
    const { service, preflight, generation, publications } = setup(draft);
    preflight.assertCanRetry.mockRejectedValue(refusal);

    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBe(refusal);

    expect(generation.retry).not.toHaveBeenCalled();
    expect(publications.attachRetryJob).not.toHaveBeenCalled();
  });

  it('refuses a retry from an owner at the active cap before any job exists', async () => {
    const { service, activeCap, generation } = setup(draft);
    const tooMany = new HttpException('429', HttpStatus.TOO_MANY_REQUESTS);
    activeCap.assertBelowCap.mockRejectedValue(tooMany);

    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBe(tooMany);

    expect(generation.retry).not.toHaveBeenCalled();
  });

  it('replaces the budget refusal with the explained one', async () => {
    const { service, generation, preflight } = setup(draft);
    const generic = new ForbiddenException('generic');
    const explained = new ForbiddenException('allowance used');
    generation.retry.mockRejectedValue(generic);
    preflight.explainBudgetDenial.mockResolvedValue(explained);

    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBe(explained);
    expect(preflight.explainBudgetDenial).toHaveBeenCalledWith('owner-1', generic);
  });

  it('keeps any other upstream failure as it is', async () => {
    const { service, generation } = setup(draft);
    const down = new Error('down');
    generation.retry.mockRejectedValue(down);

    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toBe(down);
  });

  it('cancels the new job when saving the attach throws, unless a publication already owns it', async () => {
    const { service, publications, generation } = setup(draft);
    publications.attachRetryJob.mockRejectedValue(new Error('db down'));

    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toThrow('db down');
    expect(generation.cancel).toHaveBeenCalledWith('job-2');

    generation.cancel.mockClear();
    publications.findByGenerationJobId.mockResolvedValue({ id: 'pub-1' });
    await expect(service.retry('pub-1', 'owner-1', input)).rejects.toThrow('db down');
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('serialises two simultaneous retries of one publication: one job, one clean 409', async () => {
    const { service, generation } = setup(draft);
    let current = 'FAILED';
    generation.getPrivateState.mockImplementation(async () => ({ status: current }));
    generation.retry.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      current = 'QUEUED';
      return { jobId: 'job-2', status: 'QUEUED' };
    });

    const results = await Promise.allSettled([
      service.retry('pub-1', 'owner-1', input),
      service.retry('pub-1', 'owner-1', { ...input, idempotencyKey: 'retry-2' }),
    ]);

    expect(generation.retry).toHaveBeenCalledTimes(1);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const refused = results.find(({ status }) => status === 'rejected');
    expect(refused).toMatchObject({ reason: expect.any(ConflictException) });
  });

  it('does not let one owner’s retry wait for another owner’s', async () => {
    const { service, generation } = setup(draft);
    let running = 0;
    let mostAtOnce = 0;
    generation.retry.mockImplementation(async (_jobId: string, ownerId: string) => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => setTimeout(resolve, 20));
      running -= 1;
      return { jobId: `job-${ownerId}`, status: 'QUEUED' };
    });

    await Promise.all([
      service.retry('pub-1', 'owner-1', input),
      service.retry('pub-1', 'owner-2', input),
    ]);

    expect(mostAtOnce).toBe(2);
  });
});
