import { Locale, ThreadPublicationType } from '@claw/shared-types';

import type { ChatModelResponse } from '../../../models/chat-model.client';
import { BRIEF_ROLE_ID, BRIEF_SYSTEM_PROMPT } from '../../constants/article-brief.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import type { RoleCallSpec } from '../../types/healing.types';
import { ThreadGenerationCancelledError } from '../../utilities/thread-generation-cancelled.error';
import { ArticleBriefPlanner, pickBriefRole } from '../article-brief-planner';

const role = (id: string, provider: string, model: string): ModelRole => ({
  id,
  provider,
  model,
  maxOutputTokens: 4096,
  fallbacks: [],
});

const INSTRUCTION_BOX =
  'this topic is huge, I want you to give me a very gignatic thread, never skip any detail, write the plan 100% done';

const input: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'c',
  contentLocale: Locale.AR,
  topic: INSTRUCTION_BOX,
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: {
    title: 'عاوزيك تاخد',
    messages: [
      {
        id: 'm1',
        role: 'USER',
        content: 'لو عندنا مئات الwarehouses فيها أجهزة بتقرأ RFID tags',
        createdAt: 'x',
      },
      { id: 'm2', role: 'ASSISTANT', content: '# معماريّة RFID عالية الأداء', createdAt: 'x' },
      {
        id: 'm3',
        role: 'USER',
        content: 'Combine it with the gpt plan and debate',
        createdAt: 'x',
      },
    ],
  },
  authors: [role('author-1', 'NVIDIANIM', 'z-ai/glm-5.2')],
  judge: role('judge', 'NVIDIANIM', 'moonshotai/kimi-k2.7-code'),
  critic: role('critic', 'NVIDIANIM', 'nvidia/nemotron-3-super'),
  spendCapMicroUsd: 1_000_000,
  spentMicroUsd: 0,
};

const response = (content: string): ChatModelResponse => ({
  content,
  provider: 'P',
  model: 'M',
  durationMs: 1,
  clamped: false,
  costMicroUsd: 5,
});

function setup(reply: string | Error, spent: number | null = 0) {
  const specs: RoleCallSpec[] = [];
  const call = vi.fn((_input: GenerationPipelineInput, _budget: unknown, spec: RoleCallSpec) => {
    specs.push(spec);
    return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(response(reply));
  });
  const planner = new ArticleBriefPlanner({
    call,
    spentMicroUsd: () => Promise.resolve(spent),
  });
  return { planner, call, specs };
}

describe('ArticleBriefPlanner (topic box read with the conversation, 2026-11-22)', () => {
  it('names the subject from the conversation when the box is an instruction', async () => {
    const { planner, specs } = setup(
      JSON.stringify({
        subject: 'High-throughput RFID architecture for hundreds of warehouses',
        researchQueries: ['  RFID event ingestion  ', '', 'warehouse RFID dedup'],
      }),
    );

    await expect(planner.plan(input)).resolves.toEqual({
      subject: 'High-throughput RFID architecture for hundreds of warehouses',
      researchQueries: ['RFID event ingestion', 'warehouse RFID dedup'],
    });
    const spec = specs[0];
    expect(spec?.roleKey).toBe(BRIEF_ROLE_ID);
    expect(spec?.prompt.systemPrompt).toBe(BRIEF_SYSTEM_PROMPT);
    // The box is passed as data and the whole conversation follows it.
    expect(spec?.prompt.userPrompt).toContain(JSON.stringify(INSTRUCTION_BOX));
    expect(spec?.prompt.userPrompt).toContain('RFID tags');
    expect(spec?.prompt.userPrompt).toContain('Combine it with the gpt plan');
  });

  it('answers null for a reply it cannot read, so research falls back', async () => {
    await expect(setup('I think the subject is RFID').planner.plan(input)).resolves.toBeNull();
  });

  it('answers null when the model call fails', async () => {
    await expect(
      setup(new Error('Chat model request failed (503)')).planner.plan(input),
    ).resolves.toBeNull();
  });

  it('lets a cancellation through', async () => {
    await expect(
      setup(new ThreadGenerationCancelledError()).planner.plan(input),
    ).rejects.toBeInstanceOf(ThreadGenerationCancelledError);
  });

  it('does not call a model once 85 percent of the cap is spent', async () => {
    const { planner, call } = setup('{}', 900_000);

    await expect(planner.plan(input)).resolves.toBeNull();
    expect(call).not.toHaveBeenCalled();
  });

  it('runs on the cheapest pool model, else the safe default, else the Judge', () => {
    expect(pickBriefRole(input).model).toBe('moonshotai/kimi-k2.7-code');
    expect(
      pickBriefRole({
        ...input,
        healing: {
          pool: [
            { provider: 'A', model: 'dear', costRank: 5 },
            { provider: 'B', model: 'cheap', costRank: 1 },
          ],
          safeDefault: { provider: 'C', model: 'safe' },
        },
      }).model,
    ).toBe('cheap');
    expect(
      pickBriefRole({
        ...input,
        healing: { pool: [], safeDefault: { provider: 'C', model: 'safe' } },
      }).model,
    ).toBe('safe');
  });
});
