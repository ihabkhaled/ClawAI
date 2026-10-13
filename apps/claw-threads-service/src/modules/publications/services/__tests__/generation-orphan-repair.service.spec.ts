import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { GenerationOrphanRepairService } from '../generation-orphan-repair.service';
import { GenerationStartGate } from '../generation-start-gate.service';

function setup(options: { referenced?: string[]; states?: Record<string, string | Error> } = {}) {
  const referenced = new Set(options.referenced ?? []);
  const states = options.states ?? {};
  const publications = {
    isJobReferenced: vi.fn().mockImplementation(async (jobId: string) => referenced.has(jobId)),
  };
  const generation = {
    getPrivateState: vi.fn().mockImplementation(async (jobId: string) => {
      const state = states[jobId];
      if (state instanceof Error) throw state;
      if (state === undefined) throw new NotFoundException('gone');
      return { status: state };
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  const gate = new GenerationStartGate();
  const service = new GenerationOrphanRepairService(
    publications as never,
    generation as never,
    gate,
  );
  return { service, publications, generation, gate };
}

const job = (jobId: string, ownerId = 'owner-1') => ({ jobId, ownerId });

describe('GenerationOrphanRepairService (D-03)', () => {
  it('cancels a queued job that nothing points at', async () => {
    const { service, generation } = setup({ states: { orphan: 'QUEUED' } });

    await expect(service.repair({ jobs: [job('orphan')] })).resolves.toEqual([
      { jobId: 'orphan', outcome: 'CANCELLED' },
    ]);
    expect(generation.cancel).toHaveBeenCalledExactlyOnceWith('orphan');
  });

  it('cancels a running orphan too', async () => {
    const { service, generation } = setup({ states: { orphan: 'RUNNING' } });

    await service.repair({ jobs: [job('orphan')] });

    expect(generation.cancel).toHaveBeenCalledWith('orphan');
  });

  it('never touches a job a publication or an edit review points at', async () => {
    const { service, generation } = setup({
      referenced: ['owned'],
      states: { owned: 'RUNNING' },
    });

    await expect(service.repair({ jobs: [job('owned')] })).resolves.toEqual([
      { jobId: 'owned', outcome: 'IN_USE' },
    ]);
    expect(generation.cancel).not.toHaveBeenCalled();
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });

  it('never touches a job that a start is attaching right now', async () => {
    const { service, generation, gate } = setup({ states: { fresh: 'QUEUED' } });
    const end = gate.beginAttach('fresh');

    await expect(service.repair({ jobs: [job('fresh')] })).resolves.toEqual([
      { jobId: 'fresh', outcome: 'IN_USE' },
    ]);
    end();
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('re-checks just before the write, so a job attached meanwhile is spared', async () => {
    const { service, generation, publications } = setup({ states: { racing: 'QUEUED' } });
    publications.isJobReferenced.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(service.repair({ jobs: [job('racing')] })).resolves.toEqual([
      { jobId: 'racing', outcome: 'IN_USE' },
    ]);
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('reports a job the generation service does not have for that owner', async () => {
    const { service, generation } = setup();

    await expect(service.repair({ jobs: [job('unknown', 'someone-else')] })).resolves.toEqual([
      { jobId: 'unknown', outcome: 'NOT_FOUND' },
    ]);
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it.each(['FAILED', 'CANCELLED', 'WAITING_FOR_REVIEW', 'COMPLETED'])(
    'leaves a %s job alone',
    async (status) => {
      const { service, generation } = setup({ states: { done: status } });

      await expect(service.repair({ jobs: [job('done')] })).resolves.toEqual([
        { jobId: 'done', outcome: 'ALREADY_FINISHED' },
      ]);
      expect(generation.cancel).not.toHaveBeenCalled();
    },
  );

  it('is idempotent: running it twice changes nothing the second time', async () => {
    const { service, generation } = setup({ states: { orphan: 'QUEUED' } });
    generation.cancel.mockImplementation(async () => {
      // After the cancel the job is no longer active.
      generation.getPrivateState.mockResolvedValue({ status: 'CANCELLED' });
    });

    const first = await service.repair({ jobs: [job('orphan')] });
    const second = await service.repair({ jobs: [job('orphan')] });

    expect(first[0]?.outcome).toBe('CANCELLED');
    expect(second[0]?.outcome).toBe('ALREADY_FINISHED');
    expect(generation.cancel).toHaveBeenCalledTimes(1);
  });

  it('handles a mixed batch and looks at a repeated job once', async () => {
    const { service, generation } = setup({
      referenced: ['owned'],
      states: { a: 'QUEUED', b: 'FAILED', owned: 'RUNNING' },
    });

    const results = await service.repair({
      jobs: [job('a'), job('b'), job('owned'), job('a'), job('missing')],
    });

    expect(results).toEqual([
      { jobId: 'a', outcome: 'CANCELLED' },
      { jobId: 'b', outcome: 'ALREADY_FINISHED' },
      { jobId: 'owned', outcome: 'IN_USE' },
      { jobId: 'missing', outcome: 'NOT_FOUND' },
    ]);
    expect(generation.cancel).toHaveBeenCalledTimes(1);
  });

  it('stops and reports an upstream failure rather than skipping a job silently', async () => {
    const { service, generation } = setup({
      states: { a: new ServiceUnavailableException('down'), b: 'QUEUED' },
    });

    await expect(service.repair({ jobs: [job('a'), job('b')] })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(generation.cancel).not.toHaveBeenCalled();
  });
});
