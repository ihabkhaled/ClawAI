import { ConflictException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import {
  scopedIdempotencyKey,
  startRequestFingerprint,
} from '../../utilities/generation-idempotency.utility';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationGenerationStartService } from '../publication-generation-start.service';

const role = (id: string) => ({
  id,
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  maxOutputTokens: 512,
  fallbacks: [],
});

const input: StartThreadGenerationDto = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'en' as StartThreadGenerationDto['contentLocale'],
  topic: 'A detailed research subject',
  publicationType: 'article' as StartThreadGenerationDto['publicationType'],
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

const identity = {
  keyHash: scopedIdempotencyKey('owner-1', 'request-1'),
  requestHash: startRequestFingerprint(input),
};

function setup() {
  const order: string[] = [];
  const preflight = {
    assertCanStart: vi.fn().mockImplementation(async () => {
      order.push('preflight');
    }),
    explainBudgetDenial: vi.fn().mockResolvedValue(null),
  };
  const lifecycle = {
    enqueueGeneration: vi.fn().mockImplementation(async () => {
      order.push('enqueue');
      return { publicationId: 'pub-1', jobId: 'job-1', status: 'QUEUED' };
    }),
  };
  const activeCap = {
    assertBelowCap: vi.fn().mockImplementation(async () => {
      order.push('cap');
    }),
  };
  const publications = { findStartByKey: vi.fn().mockResolvedValue(null) };
  const generation = { getPrivateState: vi.fn().mockResolvedValue({ status: 'RUNNING' }) };
  const service = new PublicationGenerationStartService(
    preflight as never,
    lifecycle as never,
    new GenerationStartGate(),
    activeCap as never,
    publications as never,
    generation as never,
  );
  return { service, preflight, lifecycle, activeCap, publications, generation, order };
}

describe('PublicationGenerationStartService', () => {
  it('queues the job only after the preflight and the active cap pass', async () => {
    const { service, order, preflight, lifecycle } = setup();

    await expect(service.start('owner-1', input)).resolves.toEqual({
      publicationId: 'pub-1',
      jobId: 'job-1',
      status: 'QUEUED',
    });
    expect(order).toEqual(['preflight', 'cap', 'enqueue']);
    expect(preflight.assertCanStart).toHaveBeenCalledWith('owner-1', input);
    expect(lifecycle.enqueueGeneration).toHaveBeenCalledWith(
      'owner-1',
      { ...input, idempotencyKey: identity.keyHash },
      identity,
    );
  });

  it('never sends the raw client key upstream: it is scoped to the owner', async () => {
    const { service, lifecycle } = setup();

    await service.start('owner-1', input);
    await service.start('owner-2', input);

    const [first, second] = lifecycle.enqueueGeneration.mock.calls.map(
      (call) => (call[1] as StartThreadGenerationDto).idempotencyKey,
    );
    expect(first).not.toBe('request-1');
    expect(first).not.toBe(second);
  });

  it('creates no job and no publication when the preflight refuses', async () => {
    const { service, preflight, lifecycle } = setup();
    preflight.assertCanStart.mockRejectedValue(new ForbiddenException('no'));

    await expect(service.start('owner-1', input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });

  it('answers 429 and creates nothing when the owner is at the active cap', async () => {
    const { service, activeCap, lifecycle } = setup();
    activeCap.assertBelowCap.mockRejectedValue(
      new HttpException('cap', HttpStatus.TOO_MANY_REQUESTS),
    );

    await expect(service.start('owner-1', input)).rejects.toMatchObject({ status: 429 });
    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });

  it('returns the same job for the same owner and key without a second preflight, cap check or job', async () => {
    const { service, publications, preflight, activeCap, lifecycle } = setup();
    publications.findStartByKey.mockResolvedValue({
      id: 'pub-1',
      generationJobId: 'job-1',
      requestHash: identity.requestHash,
    });

    await expect(service.start('owner-1', input)).resolves.toEqual({
      publicationId: 'pub-1',
      jobId: 'job-1',
      status: 'RUNNING',
    });
    expect(publications.findStartByKey).toHaveBeenCalledWith('owner-1', identity.keyHash);
    expect(preflight.assertCanStart).not.toHaveBeenCalled();
    expect(activeCap.assertBelowCap).not.toHaveBeenCalled();
    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });

  it('replays when only the correlation id changed', async () => {
    const { service, publications, lifecycle } = setup();
    publications.findStartByKey.mockResolvedValue({
      id: 'pub-1',
      generationJobId: 'job-1',
      requestHash: identity.requestHash,
    });

    await service.start('owner-1', { ...input, correlationId: 'another-trace' });

    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });

  it('answers 409 with a code when the key was used for a different request', async () => {
    const { service, publications, lifecycle } = setup();
    publications.findStartByKey.mockResolvedValue({
      id: 'pub-1',
      generationJobId: 'job-1',
      requestHash: 'a-different-request',
    });

    const outcome = service.start('owner-1', input);

    await expect(outcome).rejects.toBeInstanceOf(ConflictException);
    await expect(outcome).rejects.toMatchObject({
      response: { code: 'THREAD_IDEMPOTENCY_KEY_REUSED', statusCode: 409 },
    });
    expect(lifecycle.enqueueGeneration).not.toHaveBeenCalled();
  });

  it('looks the key up under the caller only, so another owner never meets it', async () => {
    const { service, publications } = setup();

    await service.start('owner-2', input);

    expect(publications.findStartByKey).toHaveBeenCalledWith(
      'owner-2',
      scopedIdempotencyKey('owner-2', 'request-1'),
    );
    expect(scopedIdempotencyKey('owner-2', 'request-1')).not.toBe(identity.keyHash);
  });

  it('replaces the generic budget refusal with the explained one', async () => {
    const { service, lifecycle, preflight } = setup();
    const generic = new ForbiddenException('generic');
    const explained = new ForbiddenException('allowance');
    lifecycle.enqueueGeneration.mockRejectedValue(generic);
    preflight.explainBudgetDenial.mockResolvedValue(explained);

    await expect(service.start('owner-1', input)).rejects.toBe(explained);
    expect(preflight.explainBudgetDenial).toHaveBeenCalledWith('owner-1', generic);
  });

  it('keeps any other enqueue failure as it is', async () => {
    const { service, lifecycle } = setup();
    const down = new Error('down');
    lifecycle.enqueueGeneration.mockRejectedValue(down);

    await expect(service.start('owner-1', input)).rejects.toBe(down);
  });

  describe('simultaneous starts', () => {
    /** A store that behaves like the real one: a start is visible to the next lookup only once saved. */
    function concurrentSetup() {
      const saved = new Map<string, { id: string; generationJobId: string; requestHash: string }>();
      const created: string[] = [];
      const base = setup();
      base.publications.findStartByKey.mockImplementation(
        async (_owner: string, keyHash: string) => saved.get(keyHash) ?? null,
      );
      base.lifecycle.enqueueGeneration.mockImplementation(
        async (_owner: string, sent: StartThreadGenerationDto, ident: typeof identity) => {
          await new Promise((resolve) => setTimeout(resolve, 15));
          const jobId = `job-${String(created.length + 1)}`;
          created.push(jobId);
          saved.set(sent.idempotencyKey, {
            id: `pub-${jobId}`,
            generationJobId: jobId,
            requestHash: ident.requestHash,
          });
          return { publicationId: `pub-${jobId}`, jobId, status: 'QUEUED' };
        },
      );
      return { ...base, created };
    }

    it('creates exactly one job for four parallel starts with the same key', async () => {
      const { service, created } = concurrentSetup();

      const results = await Promise.all([1, 2, 3, 4].map(() => service.start('owner-1', input)));

      expect(created).toEqual(['job-1']);
      expect(new Set(results.map(({ jobId }) => jobId))).toEqual(new Set(['job-1']));
      expect(new Set(results.map(({ publicationId }) => publicationId)).size).toBe(1);
    });

    it('lets two owners use the same key at the same time and gives each their own job', async () => {
      const { service, created } = concurrentSetup();

      const [first, second] = await Promise.all([
        service.start('owner-1', input),
        service.start('owner-2', input),
      ]);

      expect(created).toHaveLength(2);
      expect(first.jobId).not.toBe(second.jobId);
    });

    it('turns a flood past the queue limit into 429 instead of an unbounded wait', async () => {
      const { service } = concurrentSetup();

      const results = await Promise.allSettled(
        Array.from({ length: 12 }, (_value, index) =>
          Promise.resolve().then(() =>
            service.start('owner-1', { ...input, idempotencyKey: `key-${String(index)}` }),
          ),
        ),
      );

      const refused = results.filter(({ status }) => status === 'rejected');
      expect(refused.length).toBeGreaterThan(0);
      expect(refused[0]).toMatchObject({ reason: { status: 429 } });
    });
  });
});
