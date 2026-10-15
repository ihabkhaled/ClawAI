import { describe, expect, it, vi } from 'vitest';

import type { ChatModelResponse } from '../../../models/chat-model.client';
import type { GenerationPipelineInput } from '../../types/generation-pipeline.types';
import { EN_FIXTURE, JA_FIXTURE } from '../../utilities/__tests__/format-article.fixtures';
import { ArticleFormatter, pickFormatRole } from '../article-formatter';

const role = { id: 'judge', provider: 'p', model: 'm', maxOutputTokens: 4096, fallbacks: [] };

function input(overrides: Partial<GenerationPipelineInput> = {}): GenerationPipelineInput {
  return {
    jobId: 'job-1',
    ownerId: 'owner-1',
    budgetId: 'b-1',
    attempt: 1,
    correlationId: 'c-1',
    topic: 'Solar panel costs and prices',
    publicationType: 'article' as GenerationPipelineInput['publicationType'],
    contentLocale: 'en' as GenerationPipelineInput['contentLocale'],
    sourceSnapshot: {},
    authors: [role, role, role],
    judge: role,
    critic: role,
    formatStage: true,
    ...overrides,
  };
}

function reply(markdown: string): ChatModelResponse {
  return {
    content: JSON.stringify({ markdown }),
    provider: 'p',
    model: 'm',
    durationMs: 5,
    clamped: false,
    costMicroUsd: 1200,
  };
}

function draftOf(fixture: typeof EN_FIXTURE) {
  return {
    markdown: fixture.before,
    citations: fixture.evidenceIds.map((evidenceId, index) => ({
      evidenceId,
      url: fixture.urls[index] ?? fixture.urls[0] ?? '',
    })),
  };
}

describe('ArticleFormatter', () => {
  it('replaces the article with the typeset one when the guard passes', async () => {
    const call = vi.fn().mockResolvedValue(reply(EN_FIXTURE.after));
    const record = vi.fn();
    const outcome = await new ArticleFormatter({ call, record }).format(
      input(),
      draftOf(EN_FIXTURE),
    );
    expect(outcome.status).toBe('FORMATTED');
    expect(outcome.draft.markdown).toBe(EN_FIXTURE.after);
    expect(outcome.draft.citations).toEqual(draftOf(EN_FIXTURE).citations);
    expect(call).toHaveBeenCalledTimes(1);
    expect(record).not.toHaveBeenCalled();
  });

  it('keeps the original and logs a SKIPPED code when the reply loses a citation', async () => {
    const lossy = EN_FIXTURE.after.replaceAll('[a1b2c3d4]', '');
    const call = vi.fn().mockResolvedValue(reply(lossy));
    const record = vi.fn();
    const draft = draftOf(EN_FIXTURE);
    const outcome = await new ArticleFormatter({ call, record }).format(input(), draft);
    expect(outcome.status).toBe('SKIPPED');
    expect(outcome.code).toBe('FORMAT_CITATION_LOST');
    expect(outcome.draft).toBe(draft);
    expect(record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        stage: 'FORMAT',
        outcome: 'SKIPPED',
        code: 'FORMAT_CITATION_LOST',
      }),
    );
  });

  it('never fails the job when the model call throws', async () => {
    const call = vi.fn().mockRejectedValue(new Error('PROVIDER_ERROR'));
    const outcome = await new ArticleFormatter({ call, record: vi.fn() }).format(
      input(),
      draftOf(JA_FIXTURE),
    );
    expect(outcome.status).toBe('SKIPPED');
    expect(outcome.code).toBe('FORMAT_FAILED');
  });

  it('is skipped without a model call once 85 percent of the cap is spent', async () => {
    const call = vi.fn();
    const outcome = await new ArticleFormatter({
      call,
      record: vi.fn(),
      spentMicroUsd: () => Promise.resolve(860_000),
    }).format(input({ spendCapMicroUsd: 1_000_000, spentMicroUsd: 0 }), draftOf(EN_FIXTURE));
    expect(outcome.code).toBe('FORMAT_SKIPPED_BUDGET');
    expect(call).not.toHaveBeenCalled();
  });

  it('is idempotent: an already typeset article costs nothing', async () => {
    const call = vi.fn();
    const draft = { ...draftOf(EN_FIXTURE), markdown: EN_FIXTURE.after };
    const outcome = await new ArticleFormatter({ call }).format(input(), draft);
    expect(outcome.status).toBe('SKIPPED');
    expect(outcome.code).toBe('FORMAT_ALREADY_PRETTY');
    expect(call).not.toHaveBeenCalled();
  });

  it('allows one healing attempt only and no model swap', async () => {
    const call = vi.fn().mockResolvedValue(reply(EN_FIXTURE.after));
    await new ArticleFormatter({ call }).format(input(), draftOf(EN_FIXTURE));
    const [, budget, spec] = call.mock.calls[0] ?? [];
    expect(budget.jobAttemptsLeft).toBe(1);
    expect(spec.role.fallbacks).toEqual([]);
  });

  it('rethrows a cancellation instead of swallowing it', async () => {
    const controller = new AbortController();
    controller.abort();
    const call = vi.fn().mockRejectedValue(new Error('aborted'));
    await expect(
      new ArticleFormatter({ call }).format(
        input({ signal: controller.signal }),
        draftOf(EN_FIXTURE),
      ),
    ).rejects.toThrow('aborted');
  });
});

describe('pickFormatRole', () => {
  it('takes the cheapest allowed model and falls back to the Judge', () => {
    const picked = pickFormatRole(
      input({
        healing: {
          pool: [
            { provider: 'a', model: 'dear', costRank: 9 },
            { provider: 'b', model: 'cheap', costRank: 1 },
          ],
        },
      }),
      'short',
    );
    expect(picked.model).toBe('cheap');
    expect(pickFormatRole(input(), 'short').model).toBe('m');
  });

  it('sizes the output room to the article within bounds', () => {
    expect(pickFormatRole(input(), 'x').maxOutputTokens).toBe(2048);
    expect(pickFormatRole(input(), 'word '.repeat(200_000)).maxOutputTokens).toBe(32_768);
  });
});
