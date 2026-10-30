import type { UserEntitlements } from '@claw/shared-entitlements';
import { ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { costClassKey } from '../../utilities/model-cost-class.utility';
import { ModelCostClassClient } from '../model-cost-class.client';

const classPlan = {
  isAdmin: false,
  modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
  allowedCostClasses: [ModelCostClass.CHEAP],
} as unknown as UserEntitlements;

const answer = (rows: unknown) => ({ ok: true, status: 200, json: async () => rows });

describe('ModelCostClassClient (ADR-198)', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('ROUTING_SERVICE_URL', 'https://routing-service:4004');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
    ModelCostClassClient.invalidateAll();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns the class routing answers, keyed so a slash in the id cannot collide', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        answer([{ provider: 'OPENROUTER', model: 'vendor/x', costClass: ModelCostClass.CHEAP }]),
      );
    vi.stubGlobal('fetch', fetch);

    const result = await new ModelCostClassClient().forPlan(classPlan, [
      { provider: 'OPENROUTER', model: 'vendor/x' },
    ]);

    expect(result.get(costClassKey('OPENROUTER', 'vendor/x'))).toBe(ModelCostClass.CHEAP);
    expect(result.has(costClassKey('OPENROUTER/vendor', 'x'))).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'https://routing-service:4004/api/v1/internal/router-models/costs/classes',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps "no price" as null, which the plan helper refuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(answer([{ provider: 'GROK', model: 'new', costClass: null }])),
    );
    const result = await new ModelCostClassClient().forPlan(classPlan, [
      { provider: 'GROK', model: 'new' },
    ]);
    expect(result.get(costClassKey('GROK', 'new'))).toBeNull();
  });

  it('does not call routing for a plan without classes or for an admin', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCostClassClient();
    const refs = [{ provider: 'GEMINI', model: 'flash' }];

    const allowAll = { isAdmin: false, modelAccessMode: PlanModelAccessMode.ALLOW_ALL };
    await client.forPlan(allowAll as unknown as UserEntitlements, refs);
    await client.forPlan({ ...classPlan, isAdmin: true } as UserEntitlements, refs);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when routing is down and does not cache the failure', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('routing down'))
      .mockResolvedValueOnce(
        answer([{ provider: 'GEMINI', model: 'flash', costClass: ModelCostClass.CHEAP }]),
      );
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCostClassClient();
    const refs = [{ provider: 'GEMINI', model: 'flash' }];

    const down = await client.forPlan(classPlan, refs);
    expect(down.has(costClassKey('GEMINI', 'flash'))).toBe(false);

    const up = await client.forPlan(classPlan, refs);
    expect(up.get(costClassKey('GEMINI', 'flash'))).toBe(ModelCostClass.CHEAP);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('treats a bad status or a body of the wrong shape as no answer', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce(answer({ not: 'an array' }));
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCostClassClient();
    const refs = [{ provider: 'GEMINI', model: 'flash' }];

    expect((await client.forPlan(classPlan, refs)).size).toBe(0);
    expect((await client.forPlan(classPlan, refs)).size).toBe(0);
  });

  it('reuses a good answer and ignores rows it did not ask for', async () => {
    const fetch = vi.fn().mockResolvedValue(
      answer([
        { provider: 'GEMINI', model: 'flash', costClass: ModelCostClass.CHEAP },
        { provider: 'EVIL', model: 'planted', costClass: ModelCostClass.FREE },
      ]),
    );
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCostClassClient();
    const refs = [{ provider: 'GEMINI', model: 'flash' }];

    const first = await client.forPlan(classPlan, refs);
    await client.forPlan(classPlan, refs);

    expect(first.has(costClassKey('EVIL', 'planted'))).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks in batches of at most 300 pairs', async () => {
    const fetch = vi.fn().mockResolvedValue(answer([]));
    vi.stubGlobal('fetch', fetch);
    const refs = Array.from({ length: 650 }, (_, index) => ({
      provider: 'GEMINI',
      model: `m${String(index)}`,
    }));

    await new ModelCostClassClient().forPlan(classPlan, refs);

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
