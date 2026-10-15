import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { EN_FIXTURE } from '../../utilities/__tests__/format-article.fixtures';
import { FormatPreviewService } from '../format-preview.service';

const role = { id: 'j', provider: 'p', model: 'm', maxOutputTokens: 4096, fallbacks: [] };
const parentRequest = {
  ownerId: 'owner-1',
  sourceThreadId: 'thread-1',
  idempotencyKey: 'k',
  correlationId: 'c',
  spendCapMicroUsd: '500000',
  topic: 'Solar panel costs and prices',
  publicationType: 'article',
  contentLocale: 'en',
  publicIntentVersion: '1',
  authors: [role, role, role],
  judge: role,
  critic: role,
};

function dto(markdown: string) {
  return {
    ownerId: 'owner-1',
    idempotencyKey: 'key-1',
    correlationId: 'corr-1',
    contentLocale: 'en' as never,
    publicationType: 'article' as never,
    title: 'Solar panel costs',
    parentJobId: 'job-1',
    draft: {
      markdown,
      citations: [
        { evidenceId: 'a1b2c3d4', url: 'https://example.com/a' },
        { evidenceId: 'e5f6a7b8', url: 'https://example.com/b' },
      ],
    },
  };
}

function make(options: { parent?: unknown; reply?: string } = {}) {
  const models = {
    generate: vi.fn().mockResolvedValue({
      content: JSON.stringify({ markdown: options.reply ?? EN_FIXTURE.after }),
      provider: 'p',
      model: 'm',
      durationMs: 1,
      clamped: false,
    }),
  };
  const budgets = {
    reserve: vi.fn().mockResolvedValue({ id: 'bud-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const repository = {
    findRevisionParent: vi
      .fn()
      .mockResolvedValue('parent' in options ? options.parent : { request: parentRequest }),
  };
  const service = new FormatPreviewService(models as never, budgets as never, repository as never);
  return { service, models, budgets, repository };
}

describe('FormatPreviewService', () => {
  it('formats under a small budget and finalises it', async () => {
    const { service, budgets, repository } = make();
    const result = await service.preview(dto(EN_FIXTURE.before));
    expect(result.status).toBe('FORMATTED');
    expect(result.markdown).toBe(EN_FIXTURE.after);
    expect(repository.findRevisionParent).toHaveBeenCalledWith('job-1', 'owner-1');
    expect(budgets.reserve).toHaveBeenCalledWith('owner-1', 'format:key-1', 100_000);
    expect(budgets.close).toHaveBeenCalledWith('bud-1', 'FINALIZED');
  });

  it('is free for an article that is already typeset', async () => {
    const { service, budgets, models } = make();
    const result = await service.preview(dto(EN_FIXTURE.after));
    expect(result.status).toBe('SKIPPED');
    expect(result.code).toBe('FORMAT_ALREADY_PRETTY');
    expect(budgets.reserve).not.toHaveBeenCalled();
    expect(models.generate).not.toHaveBeenCalled();
  });

  it("answers 404 for a generation that is not the owner's, before any budget", async () => {
    const { service, budgets } = make({ parent: null });
    await expect(service.preview(dto(EN_FIXTURE.before))).rejects.toBeInstanceOf(NotFoundException);
    expect(budgets.reserve).not.toHaveBeenCalled();
  });

  it('keeps the article and closes the budget as platform-failed when the guard refuses', async () => {
    const { service, budgets } = make({ reply: EN_FIXTURE.after.replaceAll('[a1b2c3d4]', '') });
    const result = await service.preview(dto(EN_FIXTURE.before));
    expect(result.status).toBe('SKIPPED');
    expect(result.code).toBe('FORMAT_CITATION_LOST');
    expect(result.markdown).toBe(EN_FIXTURE.before);
    expect(budgets.close).toHaveBeenCalledWith('bud-1', 'PLATFORM_FAILED');
  });

  it('normalises a legacy article ([address, id] markers) so the guard judges layout only', async () => {
    const legacy = EN_FIXTURE.before.replaceAll('[a1b2c3d4]', '[https://example.com/a, a1b2c3d4]');
    const { service, models } = make();
    const result = await service.preview(dto(legacy));
    expect(result.status).toBe('FORMATTED');
    const prompt = JSON.stringify(models.generate.mock.calls[0]);
    expect(prompt).not.toContain('https://example.com/a, a1b2c3d4');
  });
});
