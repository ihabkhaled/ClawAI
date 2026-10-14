import { Locale, ThreadPublicationType } from '@claw/shared-types';
import { z } from 'zod';

import { ChatUpstreamError } from '../../../models/chat-upstream.error';
import type { ChatModelRequest, ChatModelResponse } from '../../../models/chat-model.client';
import { MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT } from '../../constants/healing.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type { HealerDeps, HealingBudget } from '../../types/healing.types';
import type { StepRecordInput } from '../../types/step-recorder.types';
import { RoleHealer } from '../role-healer';

const schema = z.object({ ok: z.literal(true) });
const GOOD = JSON.stringify({ ok: true });

const author = (id: string, provider: string, model: string): ModelRole => ({
  id,
  provider,
  model,
  maxOutputTokens: 4096,
  // The same shared backup for every author, as the wizard builds them.
  fallbacks: [
    { provider: 'GROK', model: 'grok-4' },
    { provider: 'OLLAMA', model: 'kimi' },
  ],
});

const authors = [
  author('author-1', 'GEMINI', 'flash'),
  author('author-2', 'GROQ', 'oss'),
  author('author-3', 'OLLAMA', 'glm'),
];

const input: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'c',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: {},
  authors,
  judge: authors[0] as ModelRole,
  critic: authors[0] as ModelRole,
};

function reply(content: string): ChatModelResponse {
  return { content, provider: 'P', model: 'M', durationMs: 5, clamped: false, costMicroUsd: 1 };
}

describe('two authors never silently become the same model (ADR-183)', () => {
  it('sends the second failing author to a model the first one is not using', async () => {
    const used: string[] = [];
    const steps: StepRecordInput[] = [];
    const deps: HealerDeps = {
      generate: (request: ChatModelRequest) => {
        used.push(`${request.provider}/${request.model}`);
        // GEMINI and GROQ are down; everything else answers.
        const down = request.provider === 'GEMINI' || request.provider === 'GROQ';
        return down
          ? Promise.reject(
              new ChatUpstreamError(
                'Chat model request failed (503: PROVIDER_UNAVAILABLE)',
                null,
                null,
              ),
            )
          : Promise.resolve(reply(GOOD));
      },
      record: (_jobId, step) => {
        steps.push(step);
        return Promise.resolve();
      },
      recordSpend: () => Promise.resolve(),
      throwIfCancelled: () => Promise.resolve(),
      loadHealth: () => Promise.resolve(new Map()),
      loadDemoted: () => Promise.resolve(new Set<string>()),
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
    const run = (target: ModelRole) =>
      healer.call(input, budget, {
        role: target,
        roleKey: `author-${target.id}`,
        round: 1,
        prompt: { systemPrompt: 's', userPrompt: 'u' },
        accepts: schema,
        shapeHint: '{"ok": true}',
      });

    await run(authors[0] as ModelRole);
    await run(authors[1] as ModelRole);

    const succeeded = steps
      .filter((step) => step.outcome === 'SUCCEEDED')
      .map((step) => `${step.roleId}:${step.provider}/${step.model}`);
    // author-1 took the first shared backup; author-2 must not repeat it.
    expect(succeeded).toEqual(['author-1:GROK/grok-4', 'author-2:OLLAMA/kimi']);
    expect(new Set(succeeded.map((entry) => entry.split(':')[1])).size).toBe(2);
    expect(used.at(-1)).toBe('OLLAMA/kimi');
  });
});
