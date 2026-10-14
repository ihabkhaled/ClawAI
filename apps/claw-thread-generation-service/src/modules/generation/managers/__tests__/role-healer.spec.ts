import { Locale, ThreadHealingStrategy, ThreadPublicationType } from '@claw/shared-types';
import { z } from 'zod';

import { ChatUpstreamError } from '../../../models/chat-upstream.error';
import type { ChatModelRequest, ChatModelResponse } from '../../../models/chat-model.client';
import {
  HEAL_STOPPED_BUDGET_CODE,
  HEAL_STOPPED_OWNER_CODE,
  HEAL_STOPPED_SPEND_CODE,
  MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
  MAX_HEAL_ATTEMPTS_PER_ROLE,
} from '../../constants/healing.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type {
  CandidateHealth,
  HealerDeps,
  HealingBudget,
  RolePrompt,
} from '../../types/healing.types';
import type { StepRecordInput } from '../../types/step-recorder.types';
import { CandidatesExhaustedError } from '../../utilities/candidates-exhausted.error';
import { DeterministicGenerationError } from '../../utilities/deterministic-generation.error';
import { ThreadGenerationCancelledError } from '../../utilities/thread-generation-cancelled.error';
import { RoleHealer } from '../role-healer';

const schema = z.object({ ok: z.literal(true) });
const GOOD = JSON.stringify({ ok: true });

const role: ModelRole = {
  id: 'author-1',
  provider: 'OPENROUTER',
  model: 'main',
  maxOutputTokens: 8192,
  fallbacks: [{ provider: 'OPENROUTER', model: 'backup' }],
};

const job: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'c',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: {},
  authors: [],
  judge: role,
  critic: role,
  healing: {
    pool: [{ provider: 'GEMINI', model: 'pool-1' }],
    safeDefault: { provider: 'GEMINI', model: 'flash' },
  },
};

type Script = (request: ChatModelRequest, call: number) => string | Error;

function reply(content: string, costMicroUsd = 10): ChatModelResponse {
  return {
    content,
    provider: 'P',
    model: 'M',
    durationMs: 5,
    clamped: false,
    costMicroUsd,
  };
}

function harness(
  script: Script,
  options: { budget?: Partial<HealingBudget>; now?: () => number } = {},
) {
  const requests: ChatModelRequest[] = [];
  const steps: StepRecordInput[] = [];
  const waits: number[] = [];
  const deps: HealerDeps = {
    generate: (request) => {
      requests.push(request);
      const next = script(request, requests.length);
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(reply(next));
    },
    record: (_jobId, step) => {
      steps.push(step);
      return Promise.resolve();
    },
    recordSpend: () => Promise.resolve(),
    throwIfCancelled: () => Promise.resolve(),
    loadHealth: () => Promise.resolve(new Map<string, CandidateHealth>()),
    loadDemoted: () => Promise.resolve(new Set<string>()),
    wait: (ms) => {
      waits.push(ms);
      return Promise.resolve();
    },
    now: options.now ?? (() => 0),
    random: () => 0.5,
  };
  const budget: HealingBudget = {
    jobAttemptsLeft: MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
    spendCapMicroUsd: null,
    spentMicroUsd: 0,
    ...options.budget,
  };
  const healer = new RoleHealer(deps);
  const run = (
    input: GenerationPipelineInput = job,
    target: ModelRole = role,
    prompt: RolePrompt = { systemPrompt: 'sys', userPrompt: 'user' },
  ) =>
    healer.call(input, budget, {
      role: target,
      roleKey: 'author-author-1',
      round: 1,
      prompt,
      accepts: schema,
      shapeHint: '{"ok": true}',
    });
  return { run, requests, steps, waits, budget };
}

const codes = (steps: StepRecordInput[]): Array<string | null | undefined> =>
  steps.filter((step) => step.outcome !== 'STARTED').map((step) => step.code);
const models = (requests: ChatModelRequest[]): string[] =>
  requests.map((request) => `${request.provider}/${request.model}`);

describe('RoleHealer (ADR-181)', () => {
  it('returns the first accepted reply with no healing step', async () => {
    const h = harness(() => GOOD);
    await h.run();
    expect(h.requests).toHaveLength(1);
    expect(codes(h.steps)).toEqual([null]);
  });

  it('waits and retries the same model after a 429, honouring Retry-After', async () => {
    const h = harness((_request, call) =>
      call === 1
        ? new ChatUpstreamError(
            'Chat model request failed (429: PROVIDER_RATE_LIMITED)',
            null,
            3000,
          )
        : GOOD,
    );
    await h.run();
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/main']);
    expect(h.waits).toEqual([3000]);
    expect(codes(h.steps)).toContain(ThreadHealingStrategy.BACKOFF_RETRY);
  });

  it('uses exponential backoff with jitter for a 503 and retries once before swapping', async () => {
    const h = harness((request) =>
      request.provider === 'GEMINI' ? GOOD : new Error('Chat model request failed (503)'),
    );
    await h.run();
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/main', 'GEMINI/pool-1']);
    expect(h.waits).toEqual([2000]);
  });

  it('lowers the output limit on a provider 400 and then succeeds on the same model', async () => {
    const h = harness((request) =>
      request.maxOutputTokens > 4096
        ? new Error('Chat model request failed (400: CLOUD_PROVIDER_REQUEST_FAILED)')
        : GOOD,
    );
    await h.run();
    expect(h.requests.map((request) => request.maxOutputTokens)).toEqual([8192, 4096]);
    expect(codes(h.steps)).toContain(ThreadHealingStrategy.LOWER_OUTPUT_LIMIT);
  });

  it('raises the output limit for a cut-off reply, then asks for a shorter article', async () => {
    const cut = '{"ok": tru';
    const h = harness((_request, call) => (call < 3 ? cut : GOOD));
    await h.run();
    expect(h.requests.map((request) => request.maxOutputTokens)).toEqual([8192, 12_288, 18_432]);
    expect(h.requests[1]?.userPrompt).toContain('cut off');
    expect(h.requests[2]?.userPrompt).toContain('shorter article');
    expect(codes(h.steps)).toEqual(
      expect.arrayContaining([
        ThreadHealingStrategy.RAISE_OUTPUT_LIMIT,
        ThreadHealingStrategy.COMPACT_OUTPUT,
      ]),
    );
  });

  it('retries a wrong-shaped reply with the reason, then runs a repair pass on the bad reply', async () => {
    const h = harness((request, call) => {
      if (call < 3) return '{"ok": "yes"}';
      expect(request.systemPrompt).toContain('fix the format');
      expect(request.userPrompt).toContain('{"ok": "yes"}');
      return GOOD;
    });
    await h.run();
    expect(h.requests).toHaveLength(3);
    expect(h.requests[1]?.userPrompt).toContain('Reason the last reply was refused');
    expect(codes(h.steps)).toEqual(
      expect.arrayContaining([
        ThreadHealingStrategy.STRICT_PROMPT,
        ThreadHealingStrategy.JSON_REPAIR,
      ]),
    );
  });

  it('skips the repair pass for a reply that is empty and goes straight to the next model', async () => {
    const h = harness((request) => (request.model === 'backup' ? GOOD : '   '));
    await h.run();
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/main', 'OPENROUTER/backup']);
    expect(h.requests.some((request) => request.systemPrompt.includes('fix the format'))).toBe(
      false,
    );
  });

  it('shrinks the source for a window overflow (4k window) and retries the same model', async () => {
    const material = JSON.stringify({
      sourceSnapshot: {
        messages: Array.from({ length: 30 }, (_, i) => ({
          id: `m${String(i)}`,
          content: 'word '.repeat(300),
        })),
      },
    });
    const h = harness((request) =>
      request.userPrompt.length > 20_000
        ? new DeterministicGenerationError('Complete role context exceeds the model window')
        : GOOD,
    );
    await h.run(job, role, {
      systemPrompt: 'sys',
      userPrompt: `${material}
Brief`,
      sharedMaterial: material,
    });
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/main']);
    expect(h.requests[1]?.userPrompt.length).toBeLessThan(h.requests[0]?.userPrompt.length ?? 0);
    expect(h.requests[1]?.userPrompt).toContain('shortened');
    expect(codes(h.steps)).toContain(ThreadHealingStrategy.SHRINK_SOURCE);
  });

  it('swaps instead when a window overflow has no source to shrink', async () => {
    const h = harness((request) =>
      request.model === 'main'
        ? new DeterministicGenerationError('Complete role context exceeds the model window')
        : GOOD,
    );
    await h.run();
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/backup']);
  });

  it('swaps to the next model on a pricing refusal (null-priced model) without retrying it', async () => {
    const h = harness((request) =>
      request.model === 'main'
        ? new Error('Chat model request failed (402: PAYG_PRICING_UNAVAILABLE)')
        : GOOD,
    );
    await h.run();
    expect(models(h.requests)).toEqual(['OPENROUTER/main', 'OPENROUTER/backup']);
    expect(codes(h.steps)).toContain(ThreadHealingStrategy.TEAM_FALLBACK);
  });

  it('goes team backup, then pool model, then the safe default, recording each swap', async () => {
    const h = harness((request) =>
      request.model === 'flash' ? GOOD : new Error('Chat model request failed (404)'),
    );
    await h.run();
    // A rejected request is first asked again with a lower output limit, then the role swaps.
    expect(models(h.requests).filter((name, i, all) => name !== all[i - 1])).toEqual([
      'OPENROUTER/main',
      'OPENROUTER/backup',
      'GEMINI/pool-1',
      'GEMINI/flash',
    ]);
    const swaps = h.steps.filter((step) => step.outcome === 'FALLBACK').map((step) => step.code);
    expect(swaps).toEqual([
      ThreadHealingStrategy.TEAM_FALLBACK,
      ThreadHealingStrategy.CROSS_PROVIDER,
      ThreadHealingStrategy.SAFE_DEFAULT,
    ]);
  });

  it('tries another provider before another model of the failed provider after an outage', async () => {
    const h = harness((request) =>
      request.provider === 'GEMINI' ? GOOD : new Error('Chat model request failed (503)'),
    );
    await h.run();
    expect(models(h.requests).at(-1)).toBe('GEMINI/pool-1');
    expect(models(h.requests)).not.toContain('OPENROUTER/backup');
  });

  it('stops at once when the owner’s credit is spent: no other model is tried', async () => {
    const h = harness(() => new Error('Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)'));
    const error = await h.run().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CandidatesExhaustedError);
    expect(h.requests).toHaveLength(1);
    expect(h.steps.map((step) => step.code)).toContain(HEAL_STOPPED_OWNER_CODE);
  });

  it('never retries a safety refusal on another model', async () => {
    const h = harness(() => new Error('Chat model request failed (400: CONTENT_FILTERED_SAFETY)'));
    await expect(h.run()).rejects.toBeInstanceOf(CandidatesExhaustedError);
    expect(h.requests).toHaveLength(1);
  });

  it('stops healing when the per-role attempt limit is reached and reports every outcome', async () => {
    const h = harness(() => new Error('Chat model request failed (404)'));
    const error = await h.run().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CandidatesExhaustedError);
    expect(h.requests.length).toBeLessThanOrEqual(MAX_HEAL_ATTEMPTS_PER_ROLE + 4);
    expect((error as CandidatesExhaustedError).outcomes).toHaveLength(4);
  });

  it('stops when the job-wide attempt budget is spent', async () => {
    const h = harness(() => new Error('Chat model request failed (503)'), {
      budget: { jobAttemptsLeft: 0 },
    });
    await expect(h.run()).rejects.toBeInstanceOf(CandidatesExhaustedError);
    // The first model is always asked once; no healing attempt follows.
    expect(h.requests).toHaveLength(1);
    expect(h.steps.map((step) => step.code)).toContain(HEAL_STOPPED_BUDGET_CODE);
  });

  it('never starts a healing attempt once 85 percent of the spend cap is gone', async () => {
    const h = harness(() => '{"ok": "no"}', {
      budget: { spendCapMicroUsd: 100, spentMicroUsd: 80 },
    });
    await expect(h.run()).rejects.toBeInstanceOf(CandidatesExhaustedError);
    // Each reply costs 10, so the second call would start at 90 of 100: allowed once, then stopped.
    expect(h.requests.length).toBeLessThanOrEqual(2);
    expect(h.steps.map((step) => step.code)).toContain(HEAL_STOPPED_SPEND_CODE);
  });

  it('is cut short by the role time budget between tries', async () => {
    let now = 0;
    const h = harness(
      () => {
        now = 10 * 60_000;
        return new Error('Chat model request failed (404)');
      },
      { now: () => now },
    );
    await expect(h.run()).rejects.toBeInstanceOf(CandidatesExhaustedError);
    expect(h.requests).toHaveLength(1);
  });

  it('lets a cancel through untouched', async () => {
    const h = harness(() => new ThreadGenerationCancelledError());
    await expect(h.run()).rejects.toBeInstanceOf(ThreadGenerationCancelledError);
  });

  it('works for a single-provider team with no pool: the same-provider backup is a real fallback', async () => {
    const h = harness((request) => (request.model === 'backup' ? GOOD : '{"ok": 1}'));
    await h.run({ ...job, healing: undefined });
    expect(models(h.requests).at(-1)).toBe('OPENROUTER/backup');
  });

  it('counts the cost of every attempt toward the spend guard', async () => {
    const h = harness((_request, call) => (call < 3 ? '{"ok": 0}' : GOOD));
    await h.run();
    expect(h.budget.spentMicroUsd).toBe(30);
    expect(h.budget.jobAttemptsLeft).toBe(MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT - 2);
  });
});
