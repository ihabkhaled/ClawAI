import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { GenerationActiveCapService } from '../generation-active-cap.service';

function setup(statuses: Record<string, string | Error>) {
  const jobs = Object.keys(statuses).map((jobId, index) => ({
    publicationId: `pub-${String(index)}`,
    jobId,
  }));
  const publications = { findDraftJobs: vi.fn().mockResolvedValue(jobs) };
  const generation = {
    getPrivateState: vi.fn().mockImplementation(async (jobId: string) => {
      const status = statuses[jobId];
      if (status instanceof Error) throw status;
      return { status };
    }),
  };
  return {
    service: new GenerationActiveCapService(publications as never, generation as never),
    publications,
    generation,
  };
}

describe('GenerationActiveCapService (D-06)', () => {
  it('lets an owner with no drafts start and asks the generation service nothing', async () => {
    const { service, generation, publications } = setup({});

    await expect(service.assertBelowCap('owner-1')).resolves.toBeUndefined();
    expect(publications.findDraftJobs).toHaveBeenCalledWith('owner-1', 25);
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });

  it('does not look at job states while the owner has fewer drafts than the cap', async () => {
    const { service, generation } = setup({ a: 'RUNNING', b: 'QUEUED' });

    await expect(service.assertBelowCap('owner-1')).resolves.toBeUndefined();
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });

  it('refuses with a coded 429 when three generations are queued or running', async () => {
    const { service } = setup({ a: 'RUNNING', b: 'QUEUED', c: 'RUNNING' });

    const outcome = service.assertBelowCap('owner-1');

    await expect(outcome).rejects.toMatchObject({
      status: 429,
      response: {
        code: 'THREAD_GENERATION_TOO_MANY_ACTIVE',
        statusCode: 429,
        limit: 3,
        active: 3,
      },
    });
    await expect(outcome).rejects.toThrow(/Wait for one to finish, or cancel one/u);
  });

  it('does not count failed, cancelled, finished or waiting-for-review generations', async () => {
    const { service } = setup({
      a: 'FAILED',
      b: 'CANCELLED',
      c: 'WAITING_FOR_REVIEW',
      d: 'COMPLETED',
      e: 'RUNNING',
    });

    await expect(service.assertBelowCap('owner-1')).resolves.toBeUndefined();
  });

  it('counts only the active ones among many drafts', async () => {
    const { service } = setup({
      a: 'FAILED',
      b: 'RUNNING',
      c: 'FAILED',
      d: 'QUEUED',
      e: 'RUNNING',
    });

    await expect(service.assertBelowCap('owner-1')).rejects.toMatchObject({ status: 429 });
  });

  it('treats a job the generation service no longer has as not running', async () => {
    const { service } = setup({
      a: new NotFoundException('gone'),
      b: 'RUNNING',
      c: 'RUNNING',
    });

    await expect(service.assertBelowCap('owner-1')).resolves.toBeUndefined();
  });

  it('fails closed when the generation service cannot answer, instead of guessing', async () => {
    const { service } = setup({
      a: new ServiceUnavailableException('down'),
      b: 'RUNNING',
      c: 'RUNNING',
    });

    await expect(service.assertBelowCap('owner-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('asks about each draft once, all at the same time', async () => {
    const { service, generation } = setup({ a: 'FAILED', b: 'FAILED', c: 'FAILED', d: 'FAILED' });
    let running = 0;
    let mostAtOnce = 0;
    generation.getPrivateState.mockImplementation(async () => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return { status: 'FAILED' };
    });

    await service.assertBelowCap('owner-1');

    expect(generation.getPrivateState).toHaveBeenCalledTimes(4);
    expect(mostAtOnce).toBe(4);
  });
});
