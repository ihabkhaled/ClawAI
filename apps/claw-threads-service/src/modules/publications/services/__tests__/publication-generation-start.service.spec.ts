import { ForbiddenException } from '@nestjs/common';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { PublicationGenerationStartService } from '../publication-generation-start.service';

const input = { sourceThreadId: 'thread-1' } as StartThreadGenerationDto;

describe('PublicationGenerationStartService', () => {
  it('queues the job only after the preflight passes', async () => {
    const order: string[] = [];
    const preflight = {
      assertCanStart: vi.fn().mockImplementation(async () => {
        order.push('preflight');
      }),
    };
    const lifecycle = {
      enqueueGeneration: vi.fn().mockImplementation(async () => {
        order.push('enqueue');
        return { publicationId: 'pub-1', jobId: 'job-1', status: 'QUEUED' };
      }),
    };
    const service = new PublicationGenerationStartService(preflight as never, lifecycle as never);

    await expect(service.start('owner-1', input)).resolves.toEqual({
      publicationId: 'pub-1',
      jobId: 'job-1',
      status: 'QUEUED',
    });
    expect(order).toEqual(['preflight', 'enqueue']);
    expect(preflight.assertCanStart).toHaveBeenCalledWith('owner-1', input);
  });

  it('creates no job and no publication when the preflight refuses', async () => {
    const preflight = { assertCanStart: vi.fn().mockRejectedValue(new ForbiddenException('no')) };
    const lifecycle = { enqueueGeneration: vi.fn() };
    const service = new PublicationGenerationStartService(preflight as never, lifecycle as never);

    await expect(service.start('owner-1', input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });
});
