import { vi } from 'vitest';

import { FeedbackSourceBackfillMigration } from '../feedback-source-backfill.migration';

import type { FeedbackRepository } from '../../repositories/feedback.repository';

function build(backfillSource: ReturnType<typeof vi.fn>): FeedbackSourceBackfillMigration {
  return new FeedbackSourceBackfillMigration({ backfillSource } as unknown as FeedbackRepository);
}

describe('FeedbackSourceBackfillMigration', () => {
  it('runs the repository backfill on bootstrap', async () => {
    const backfillSource = vi.fn().mockResolvedValue(7);
    await build(backfillSource).onApplicationBootstrap();
    expect(backfillSource).toHaveBeenCalledTimes(1);
  });

  it('is quiet and fine when nothing needs backfilling', async () => {
    const backfillSource = vi.fn().mockResolvedValue(0);
    await expect(build(backfillSource).onApplicationBootstrap()).resolves.toBeUndefined();
  });

  it('never blocks boot when the backfill fails', async () => {
    const backfillSource = vi.fn().mockRejectedValue(new Error('mongo down'));
    await expect(build(backfillSource).onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
