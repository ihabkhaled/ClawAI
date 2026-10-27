import { Locale, ThreadPublicationType } from '@claw/shared-types';
import { z } from 'zod';

import { ChatUpstreamError } from '../../../models/chat-upstream.error';
import type { ChatModelRequest, ChatModelResponse } from '../../../models/chat-model.client';
import {
  MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
  REVIEWERS_NOT_INDEPENDENT_CODE,
} from '../../constants/healing.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type { HealerDeps, HealingBudget } from '../../types/healing.types';
import type { StepRecordInput } from '../../types/step-recorder.types';
import { ReviewersNotIndependentError } from '../../utilities/reviewers-not-independent.error';
import { isDeterministicGenerationError } from '../../utilities/deterministic-generation.error';
import { parseStepError } from '../../utilities/parse-step-error.utility';
import { RoleHealer } from '../role-healer';

const schema = z.object({ ok: z.literal(true) });
const GOOD = JSON.stringify({ ok: true });
const SHARED = { provider: 'SHARED', model: 'shared-fallback' };

const seat = (
  id: string,
  provider: string,
  model: string,
  fallbacks: ModelRole['fallbacks'],
): ModelRole => ({ id, provider, model, maxOutputTokens: 4096, fallbacks });

const author = (id: string, provider: string): ModelRole =>
  seat(id, provider, `${provider.toLowerCase()}-m`, []);

function inputOf(
  judge: ModelRole,
  critic: ModelRole,
  pool: string[] = [],
): GenerationPipelineInput {
  return {
    jobId: 'job-1',
    ownerId: 'owner-1',
    budgetId: 'budget-1',
    attempt: 1,
    correlationId: 'c',
    contentLocale: Locale.EN,
    topic: 'A sufficiently detailed topic',
    publicationType: ThreadPublicationType.ARTICLE,
    sourceSnapshot: {},
    authors: [author('author-1', 'A1'), author('author-2', 'A2'), author('author-3', 'A3')],
    judge,
    critic,
    healing: { pool: pool.map((provider) => ({ provider, model: `${provider.toLowerCase()}-m` })) },
  };
}

const creditOut = (): Promise<ChatModelResponse> =>
  Promise.reject(
    new ChatUpstreamError('Chat model request failed (402: PROVIDER_CREDIT_EXHAUSTED)', null, null),
  );

function reply(request: ChatModelRequest): ChatModelResponse {
  return {
    content: GOOD,
    provider: request.provider,
    model: request.model,
    durationMs: 5,
    clamped: false,
    costMicroUsd: 1,
  };
}

function harness(down: ReadonlySet<string>, saved: Record<string, string> = {}) {
  const used: string[] = [];
  const steps: StepRecordInput[] = [];
  const deps: HealerDeps = {
    generate: (request) => {
      const key = `${request.provider}/${request.model}`;
      used.push(key);
      return down.has(request.provider) ? creditOut() : Promise.resolve(reply(request));
    },
    record: (_jobId, step) => {
      steps.push(step);
      return Promise.resolve();
    },
    recordSpend: () => Promise.resolve(),
    throwIfCancelled: () => Promise.resolve(),
    loadHealth: () => Promise.resolve(new Map()),
    loadDemoted: () => Promise.resolve(new Set<string>()),
    loadSuccessful: (_jobId, roleId) => Promise.resolve(saved[roleId] ?? null),
    wait: () => Promise.resolve(),
    now: () => 0,
    random: () => 0.5,
  };
  const budget: HealingBudget = {
    jobAttemptsLeft: MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
    spendCapMicroUsd: null,
    spentMicroUsd: 0,
  };
  const healer = new RoleHealer(deps);
  const call = (input: GenerationPipelineInput, role: ModelRole, roleKey: string) =>
    healer.call(input, budget, {
      role,
      roleKey,
      round: 1,
      prompt: { systemPrompt: 's', userPrompt: 'u' },
      accepts: schema,
      shapeHint: '{"ok":true}',
    });
  return { used, steps, call };
}

describe('the Critic is never the model that answered the Judge (ADR-195)', () => {
  it('re-picks the Critic from the pool when its fallback would be the Judge’s model', async () => {
    const judge = seat('judge', 'JP', 'jm', [SHARED]);
    const critic = seat('critic', 'CP', 'cm', [SHARED]);
    const input = inputOf(judge, critic, ['POOL_B']);
    const { used, steps, call } = harness(new Set(['JP', 'CP']));

    const judged = await call(input, judge, 'judge');
    const criticised = await call(input, critic, 'critic');

    expect(`${judged.provider}/${judged.model}`).toBe('SHARED/shared-fallback');
    expect(`${criticised.provider}/${criticised.model}`).toBe('POOL_B/pool_b-m');
    expect(used.filter((key) => key === 'SHARED/shared-fallback')).toHaveLength(1);
    expect(steps.some((step) => step.code === REVIEWERS_NOT_INDEPENDENT_CODE)).toBe(false);
  });

  it('fails closed with a coded SKIPPED step when only the Judge’s model is left', async () => {
    const judge = seat('judge', 'JP', 'jm', [SHARED]);
    const critic = seat('critic', 'CP', 'cm', [SHARED]);
    const input = inputOf(judge, critic);
    const { used, steps, call } = harness(new Set(['JP', 'CP']));

    await call(input, judge, 'judge');
    const failure = await call(input, critic, 'critic').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ReviewersNotIndependentError);
    expect(isDeterministicGenerationError(failure)).toBe(true);
    // The shared model was asked once, for the Judge; the Critic never used it.
    expect(used.filter((key) => key === 'SHARED/shared-fallback')).toHaveLength(1);
    const note = steps.find((step) => step.code === REVIEWERS_NOT_INDEPENDENT_CODE);
    expect(note).toMatchObject({
      outcome: 'SKIPPED',
      roleId: 'critic',
      roleKind: 'CRITIC',
      provider: 'SHARED',
      model: 'shared-fallback',
    });
    expect(parseStepError(failure).code).toBe(REVIEWERS_NOT_INDEPENDENT_CODE);
  });

  it('does not touch a Critic whose own model is healthy and different', async () => {
    const judge = seat('judge', 'JP', 'jm', [SHARED]);
    const critic = seat('critic', 'CP', 'cm', [SHARED]);
    const input = inputOf(judge, critic);
    const { call } = harness(new Set(['JP']));

    await call(input, judge, 'judge');
    const criticised = await call(input, critic, 'critic');

    expect(`${criticised.provider}/${criticised.model}`).toBe('CP/cm');
  });

  it('reads the Judge’s model from the saved reply when the job resumed', async () => {
    const judge = seat('judge', 'JP', 'jm', [SHARED]);
    const critic = seat('critic', 'CP', 'cm', [SHARED]);
    const input = inputOf(judge, critic);
    const { call } = harness(new Set(['CP']), { judge: 'SHARED/shared-fallback' });

    // The Judge reply is replayed from storage; only the Critic calls a model.
    const failure = await call(input, critic, 'critic').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ReviewersNotIndependentError);
  });

  it('leaves seats the owner gave the same model on purpose as chosen', async () => {
    const judge = seat('judge', 'SAME', 'm', []);
    const critic = seat('critic', 'SAME', 'm', []);
    const input = inputOf(judge, critic);
    const { call } = harness(new Set());

    await call(input, judge, 'judge');
    const criticised = await call(input, critic, 'critic');

    expect(`${criticised.provider}/${criticised.model}`).toBe('SAME/m');
  });

  it('keeps the Judge off the Critic’s own model when it has to fall back', async () => {
    const criticModel = { provider: 'CP', model: 'cm' };
    const judge = seat('judge', 'JP', 'jm', [criticModel, SHARED]);
    const critic = seat('critic', 'CP', 'cm', [SHARED]);
    const input = inputOf(judge, critic);
    const { call } = harness(new Set(['JP']));

    const judged = await call(input, judge, 'judge');

    expect(`${judged.provider}/${judged.model}`).toBe('SHARED/shared-fallback');
  });

  it('does not constrain the authors or the Judge by this rule', async () => {
    const judge = seat('judge', 'JP', 'jm', []);
    const critic = seat('critic', 'CP', 'cm', []);
    const input = inputOf(judge, critic);
    const { steps, call } = harness(new Set());

    await call(input, judge, 'judge');
    await call(input, input.authors[0] as ModelRole, 'author-author-1');

    expect(steps.some((step) => step.code === REVIEWERS_NOT_INDEPENDENT_CODE)).toBe(false);
  });
});
