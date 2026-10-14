import { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationLifecycleService } from '../publication-lifecycle.service';

const seat = (id: string) => ({
  id,
  provider: 'GEMINI',
  model: 'm',
  maxOutputTokens: 512,
  fallbacks: [],
});

const input: StartThreadGenerationDto = {
  capMicroUsd: 1_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'key',
  correlationId: 'corr',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
  authors: [seat('author-1'), seat('author-2'), seat('author-3')],
  judge: seat('judge'),
  critic: seat('critic'),
};

function build(healingPool?: { forOwner: ReturnType<typeof vi.fn> }) {
  const generation = {
    enqueue: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'QUEUED' }),
    cancel: vi.fn(),
  };
  const publications = {
    createQueuedPublication: vi.fn().mockResolvedValue({ id: 'pub-1' }),
    findByGenerationJobId: vi.fn(),
  };
  const service = new PublicationLifecycleService(
    publications as never,
    generation as never,
    {} as never,
    new GenerationStartGate(),
    undefined,
    undefined,
    healingPool as never,
  );
  return { service, generation };
}

describe('PublicationLifecycleService healing pool (ADR-181)', () => {
  it('hands the owner’s healing pool to the generation service', async () => {
    const pool = { pool: [{ provider: 'GROK', model: 'mini' }] };
    const { service, generation } = build({ forOwner: vi.fn().mockResolvedValue(pool) });

    await service.enqueueGeneration('owner-1', input);

    expect(generation.enqueue).toHaveBeenCalledWith('owner-1', input, pool);
  });

  it('starts without a pool when none could be built', async () => {
    const { service, generation } = build({ forOwner: vi.fn().mockResolvedValue(undefined) });
    await service.enqueueGeneration('owner-1', input);
    expect(generation.enqueue).toHaveBeenCalledWith('owner-1', input, undefined);
  });

  it('starts without a pool service at all (older wiring)', async () => {
    const { service, generation } = build();
    await service.enqueueGeneration('owner-1', input);
    expect(generation.enqueue).toHaveBeenCalledWith('owner-1', input, undefined);
  });
});
