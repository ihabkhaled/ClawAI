import { EventPattern } from '@claw/shared-types';

import { GenerationJobsService } from '../generation-jobs.service';
import { GenerationJobStorageResult } from '../../../../common/enums/generation-job-storage-result.enum';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
  maxOutputTokens: 1024,
  fallbacks: [],
});

describe('GenerationJobsService', () => {
  it('persists the owned snapshot before publishing the durable dispatch event', async () => {
    const order: string[] = [];
    const snapshot = {
      sourceThreadId: 'thread-1',
      sha256: 'a'.repeat(64),
      messages: [{ role: 'USER', content: 'topic' }],
    };
    const snapshots = { getOwnedSnapshot: vi.fn().mockResolvedValue(snapshot) };
    const repository = {
      createQueued: vi.fn().mockImplementation(async () => {
        order.push('persist');
        return {
          result: GenerationJobStorageResult.SUCCESS,
          job: { id: 'job-1', status: 'QUEUED' },
        };
      }),
    };
    const rabbit = {
      publishConfirmed: vi.fn().mockImplementation(async () => order.push('publish')),
    };
    const service = new GenerationJobsService(
      snapshots as never,
      repository as never,
      rabbit as never,
      {} as never,
      {} as never,
    );

    const result = await service.enqueue({
      ownerId: 'owner-1',
      sourceThreadId: 'thread-1',
      idempotencyKey: 'request-1',
      correlationId: 'correlation-1',
      budgetId: 'budget-1',
      spendCapMicroUsd: '5000000',
      topic: 'A detailed topic for a publication',
      publicationType: 'article',
      publicIntentVersion: 'threads-public-v1',
      authors: [role('author-1'), role('author-2'), role('author-3')],
      judge: role('judge'),
      critic: role('critic'),
    });

    expect(result).toEqual({ jobId: 'job-1', status: 'QUEUED' });
    expect(repository.createQueued).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1' }),
      snapshot,
      snapshot.sha256,
    );
    expect(rabbit.publishConfirmed).toHaveBeenCalledWith(
      EventPattern.THREAD_GENERATION_REQUESTED,
      expect.objectContaining({ jobId: 'job-1', correlationId: 'correlation-1' }),
    );
    expect(order).toEqual(['persist', 'publish']);
  });
});
