import type { AuthenticatedUser } from '@claw/shared-types';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { PublicationGenerationController } from '../publication-generation.controller';

describe('PublicationGenerationController', () => {
  it('hands the validated body and the authenticated owner to the start service', async () => {
    const start = vi
      .fn()
      .mockResolvedValue({ publicationId: 'pub-1', jobId: 'job-1', status: 'QUEUED' });
    const controller = new PublicationGenerationController({ start } as never);
    const body = { sourceThreadId: 'thread-1' } as StartThreadGenerationDto;

    await expect(controller.enqueue(body, { id: 'owner-1' } as AuthenticatedUser)).resolves.toEqual(
      { publicationId: 'pub-1', jobId: 'job-1', status: 'QUEUED' },
    );
    expect(start).toHaveBeenCalledWith('owner-1', body);
  });
});
