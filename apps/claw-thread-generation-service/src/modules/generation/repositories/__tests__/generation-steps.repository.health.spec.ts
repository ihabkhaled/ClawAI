import { GenerationStepsRepository } from '../generation-steps.repository';

function build(groups: unknown[], rows: unknown[]) {
  const prisma = {
    threadGenerationStep: {
      groupBy: vi.fn().mockResolvedValue(groups),
      findMany: vi.fn().mockResolvedValue(rows),
    },
  };
  return { repository: new GenerationStepsRepository(prisma as never), prisma };
}

describe('GenerationStepsRepository healing reads (ADR-181)', () => {
  it('counts recent successes and failures per provider and model, system steps excluded', async () => {
    const { repository, prisma } = build(
      [
        { provider: 'GEMINI', model: 'flash', outcome: 'SUCCEEDED', _count: { _all: 8 } },
        { provider: 'GEMINI', model: 'flash', outcome: 'FAILED', _count: { _all: 2 } },
        { provider: null, model: null, outcome: 'FAILED', _count: { _all: 9 } },
      ],
      [],
    );

    const health = await repository.recentModelHealth(new Date('2026-10-14T10:00:00Z'));

    expect(health.get('GEMINI/flash')).toEqual({ ok: 8, failed: 2 });
    expect(health.size).toBe(1);
    expect(prisma.threadGenerationStep.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ roleKind: { not: 'SYSTEM' } }) }),
    );
  });

  it('marks a model that failed for its own reasons and never recovered, not a transient failure or a recovered one', async () => {
    const row = (
      provider: string,
      model: string,
      outcome: string,
      code: string | null,
      httpStatus: number | null,
    ) => ({
      provider,
      model,
      outcome,
      code,
      httpStatus,
    });
    const { repository } = build(
      [],
      [
        row('OPENROUTER', 'bad', 'FAILED', 'OUTPUT_INVALID', null),
        row('OPENROUTER', 'flaky', 'FAILED', 'PROVIDER_ERROR', 503),
        row('OPENROUTER', 'fixed', 'FAILED', 'OUTPUT_INVALID', null),
        row('OPENROUTER', 'fixed', 'SUCCEEDED', null, null),
        row('OPENROUTER', 'unpriced', 'FAILED', 'PAYG_PRICING_UNAVAILABLE', 402),
      ],
    );

    const demoted = await repository.modelSpecificFailures('job-1', 'author-1');

    expect([...demoted].sort()).toEqual(['OPENROUTER/bad', 'OPENROUTER/unpriced']);
  });
});
