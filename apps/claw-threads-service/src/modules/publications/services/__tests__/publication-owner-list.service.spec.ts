import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { PublicationGenerationState } from '../../../../generated/prisma';
import { PublicationOwnerListService } from '../publication-owner-list.service';

const query = { page: 1, pageSize: 10, q: undefined, status: 'ALL' as const };

function setup(unresolved: Array<{ id: string; generationJobId: string }> = []) {
  const pages = {
    findUnresolved: vi.fn().mockResolvedValue(unresolved),
    recordState: vi.fn().mockResolvedValue(true),
    findPageIds: vi.fn().mockResolvedValue({ ids: ['a', 'b'], total: 23 }),
    hydrate: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
  };
  const publications = { savePrivateDraft: vi.fn().mockResolvedValue(undefined) };
  const generation = {
    getPrivateState: vi.fn(),
    getProgress: vi.fn(),
  };
  const service = new PublicationOwnerListService(
    pages as never,
    publications as never,
    generation as never,
  );
  return { service, pages, publications, generation };
}

describe('PublicationOwnerListService.list', () => {
  it('returns items with page, pageSize, total and totalPages', async () => {
    const { service, pages } = setup();
    const result = await service.list('owner-1', { ...query, page: 2, pageSize: 10 });
    expect(result).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
    expect(pages.findPageIds).toHaveBeenCalledWith(
      { ownerId: 'owner-1', q: undefined, status: 'ALL' },
      10,
      10,
    );
    expect(pages.hydrate).toHaveBeenCalledWith('owner-1', ['a', 'b']);
  });

  it('a page beyond the last returns no items but the real total', async () => {
    const { service, pages } = setup();
    pages.findPageIds.mockResolvedValue({ ids: [], total: 23 });
    pages.hydrate.mockResolvedValue([]);
    const result = await service.list('owner-1', { ...query, page: 99 });
    expect(result).toMatchObject({ items: [], page: 99, total: 23, totalPages: 3 });
    expect(pages.findPageIds).toHaveBeenCalledWith(expect.anything(), 10, 980);
  });

  it('an empty list has total 0 and totalPages 0', async () => {
    const { service, pages } = setup();
    pages.findPageIds.mockResolvedValue({ ids: [], total: 0 });
    pages.hydrate.mockResolvedValue([]);
    await expect(service.list('owner-1', query)).resolves.toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
    });
  });

  it('passes the search text, the status filter and the page size to the query', async () => {
    const { service, pages } = setup();
    await service.list('owner-1', { page: 1, pageSize: 50, q: '50%_', status: 'FAILED' });
    expect(pages.findPageIds).toHaveBeenCalledWith(
      { ownerId: 'owner-1', q: '50%_', status: 'FAILED' },
      50,
      0,
    );
  });

  it('only ever reads for the caller as owner', async () => {
    const { service, pages, generation } = setup([{ id: 'p1', generationJobId: 'j1' }]);
    generation.getPrivateState.mockResolvedValue({ status: 'RUNNING', stage: 'RESEARCH' });
    await service.list('owner-7', query);
    expect(pages.findUnresolved).toHaveBeenCalledWith('owner-7', expect.any(Date), 20);
    expect(generation.getPrivateState).toHaveBeenCalledWith('j1', 'owner-7');
    expect(pages.hydrate).toHaveBeenCalledWith('owner-7', expect.any(Array));
  });
});

describe('PublicationOwnerListService job state reconcile', () => {
  const row = [{ id: 'p1', generationJobId: 'j1' }];

  it('stores GENERATING for a queued or running job', async () => {
    for (const status of ['QUEUED', 'RUNNING']) {
      const { service, pages, generation } = setup(row);
      generation.getPrivateState.mockResolvedValue({ status, stage: 'RESEARCH' });
      await service.list('o', query);
      expect(pages.recordState).toHaveBeenCalledWith('p1', 'j1', {
        state: PublicationGenerationState.GENERATING,
        failureCode: null,
        failureStep: null,
        failureRetryable: null,
      });
    }
  });

  it('stores DONE for a finished job and saves its draft first, as the publish path does', async () => {
    for (const status of ['WAITING_FOR_REVIEW', 'COMPLETED']) {
      const { service, pages, publications, generation } = setup(row);
      const draft = { markdown: '# T', citations: [], judgeScore: 90, criticScore: 90 };
      generation.getPrivateState.mockResolvedValue({ status, stage: 'REVIEW', draft });
      await service.list('o', query);
      expect(publications.savePrivateDraft).toHaveBeenCalledWith('p1', draft);
      expect(pages.recordState).toHaveBeenCalledWith(
        'p1',
        'j1',
        expect.objectContaining({ state: PublicationGenerationState.DONE }),
      );
    }
  });

  it('stores FAILED with the progress failure code, step and retryable flag', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockResolvedValue({
      status: 'FAILED',
      stage: 'REVIEW',
      safeErrorCode: 'OTHER',
    });
    generation.getProgress.mockResolvedValue({
      failure: { code: 'JUDGE_SCORE_LOW', failedStage: 'REVIEW', retryable: false },
    });
    await service.list('o', query);
    expect(pages.recordState).toHaveBeenCalledWith('p1', 'j1', {
      state: PublicationGenerationState.FAILED,
      failureCode: 'JUDGE_SCORE_LOW',
      failureStep: 'REVIEW',
      failureRetryable: false,
    });
  });

  it('falls back to the state read when the progress snapshot is unavailable', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockResolvedValue({
      status: 'FAILED',
      stage: 'AUTHOR_DRAFTS',
      safeErrorCode: 'PROVIDER_ERROR',
    });
    generation.getProgress.mockRejectedValue(new ServiceUnavailableException());
    await service.list('o', query);
    expect(pages.recordState).toHaveBeenCalledWith('p1', 'j1', {
      state: PublicationGenerationState.FAILED,
      failureCode: 'PROVIDER_ERROR',
      failureStep: 'AUTHOR_DRAFTS',
      failureRetryable: true,
    });
  });

  it('stores a cancelled job as CANCELLED with code JOB_CANCELLED', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockResolvedValue({ status: 'CANCELLED', stage: 'RESEARCH' });
    await service.list('o', query);
    expect(pages.recordState).toHaveBeenCalledWith('p1', 'j1', {
      state: PublicationGenerationState.CANCELLED,
      failureCode: 'JOB_CANCELLED',
      failureStep: 'RESEARCH',
      failureRetryable: true,
    });
  });

  it('stores a vanished job as a non-retryable failure instead of failing the list', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockRejectedValue(new NotFoundException());
    await service.list('o', query);
    expect(pages.recordState).toHaveBeenCalledWith('p1', 'j1', {
      state: PublicationGenerationState.FAILED,
      failureCode: 'GENERATION_JOB_MISSING',
      failureStep: null,
      failureRetryable: false,
    });
  });

  it('never fails the list when the generation service is down; the row is left as it was', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.list('o', query)).resolves.toMatchObject({ total: 23 });
    expect(pages.recordState).not.toHaveBeenCalled();
  });

  it('never fails the list when the unresolved lookup itself fails', async () => {
    const { service, pages } = setup();
    pages.findUnresolved.mockRejectedValue(new Error('db'));
    await expect(service.list('o', query)).resolves.toMatchObject({ total: 23 });
  });

  it('ignores a job status it does not know', async () => {
    const { service, pages, generation } = setup(row);
    generation.getPrivateState.mockResolvedValue({ status: 'SOMETHING_NEW', stage: 'X' });
    await service.list('o', query);
    expect(pages.recordState).not.toHaveBeenCalled();
  });

  it('reads at most 5 jobs at a time', async () => {
    const many = Array.from({ length: 12 }, (_value, index) => ({
      id: `p${String(index)}`,
      generationJobId: `j${String(index)}`,
    }));
    const { service, generation } = setup(many);
    let running = 0;
    let peak = 0;
    generation.getPrivateState.mockImplementation(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return { status: 'RUNNING', stage: 'RESEARCH' };
    });
    await service.list('o', query);
    expect(generation.getPrivateState).toHaveBeenCalledTimes(12);
    expect(peak).toBe(5);
  });
});
