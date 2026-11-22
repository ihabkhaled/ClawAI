import { estimateTextTokens } from '@claw/shared-utilities';
import { Locale, ThreadPublicationType } from '@claw/shared-types';
import { z } from 'zod';

import type { ChatModelRequest } from '../../../models/chat-model.client';
import { MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT } from '../../constants/healing.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type { CandidateHealth, HealerDeps } from '../../types/healing.types';
import { buildSharedMaterial } from '../../utilities/shared-material.utility';
import { RoleHealer } from '../role-healer';

const schema = z.object({ ok: z.literal(true) });

const role: ModelRole = {
  id: 'author-1',
  provider: 'NVIDIANIM',
  model: 'z-ai/glm-5.2',
  maxOutputTokens: 8192,
  fallbacks: [],
};

/** A long chat like the production one: big architecture answers between short owner turns. */
const messages = Array.from({ length: 24 }, (_, index) => ({
  id: `m${String(index)}`,
  role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
  content: `turn-${String(index)}-start ${'RFID reader event pipeline '.repeat(index % 2 === 0 ? 40 : 400)} turn-${String(index)}-end`,
  createdAt: 'x',
}));

const job: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'c',
  contentLocale: Locale.EN,
  topic: 'never concise, very long',
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: { title: 'RFID', messages },
  authors: [role],
  judge: role,
  critic: role,
};

function run(windowTokens: HealerDeps['windowTokens']) {
  const requests: ChatModelRequest[] = [];
  const deps: HealerDeps = {
    generate: (request) => {
      requests.push(request);
      return Promise.resolve({
        content: JSON.stringify({ ok: true }),
        provider: 'P',
        model: 'M',
        durationMs: 1,
        clamped: false,
      });
    },
    record: () => Promise.resolve(),
    recordSpend: () => Promise.resolve(),
    throwIfCancelled: () => Promise.resolve(),
    loadHealth: () => Promise.resolve(new Map<string, CandidateHealth>()),
    loadDemoted: () => Promise.resolve(new Set<string>()),
    wait: () => Promise.resolve(),
    windowTokens,
    now: () => 0,
    random: () => 0.5,
  };
  const material = buildSharedMaterial(job, { items: [{ id: 'e1', url: 'https://example.org' }] });
  const call = new RoleHealer(deps).call(
    job,
    {
      jobAttemptsLeft: MAX_HEAL_ATTEMPTS_PER_JOB_ATTEMPT,
      spendCapMicroUsd: null,
      spentMicroUsd: 0,
    },
    {
      role,
      roleKey: role.id,
      round: 1,
      prompt: { systemPrompt: 'sys', userPrompt: `${material}\nBrief`, sharedMaterial: material },
      accepts: schema,
      shapeHint: '{}',
    },
  );
  return { call, requests, material };
}

describe('RoleHealer fits the source conversation to the model window before the call', () => {
  it('condenses a long chat into a 32k window, keeping every turn and saying so', async () => {
    const { call, requests, material } = run(() => Promise.resolve(32_768));
    await call;

    const sent = requests[0]?.userPrompt ?? '';
    expect(requests).toHaveLength(1);
    expect(estimateTextTokens(material)).toBeGreaterThan(32_768);
    expect(estimateTextTokens(`sys\n${sent}`) + role.maxOutputTokens).toBeLessThanOrEqual(32_768);
    for (const { id } of messages) expect(sent).toContain(`"id":"${id}"`);
    expect(sent).toContain('turn-1-start');
    expect(sent).toContain('turn-23-end');
    expect(sent).toContain('fitNote');
    expect(sent).toContain('https://example.org');
    expect(sent.endsWith('\nBrief')).toBe(true);
  });

  it('sends the whole chat to a model whose window holds it', async () => {
    const { call, requests, material } = run(() => Promise.resolve(1_000_000));
    await call;

    expect(requests[0]?.userPrompt).toBe(`${material}\nBrief`);
  });

  it('sends the prompt as it is when the window lookup fails', async () => {
    const { call, requests, material } = run(() => Promise.reject(new Error('catalog down')));
    await call;

    expect(requests[0]?.userPrompt).toBe(`${material}\nBrief`);
  });
});
