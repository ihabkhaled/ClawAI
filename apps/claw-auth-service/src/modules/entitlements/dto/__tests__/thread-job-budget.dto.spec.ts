import { describe, expect, it } from 'vitest';

import { threadJobBudgetCallSchema, threadJobBudgetCloseSchema } from '../thread-job-budget.dto';

describe('thread job budget DTOs', () => {
  it('accepts Prisma CUID budget identifiers and UUID wallet reservations', () => {
    expect(
      threadJobBudgetCallSchema.safeParse({
        budgetId: 'clx12345678901234567890123',
        requestId: 'generation-request',
        creditReservationId: '00000000-0000-4000-8000-000000000001',
        amountMicroUsd: 10,
      }).success,
    ).toBe(true);
  });

  it('accepts only supported close states and bounded CUID identifiers', () => {
    expect(
      threadJobBudgetCloseSchema.safeParse({
        budgetId: 'clx12345678901234567890123',
        status: 'FINALIZED',
      }).success,
    ).toBe(true);
    expect(
      threadJobBudgetCloseSchema.safeParse({ budgetId: 'x'.repeat(65), status: 'FINALIZED' })
        .success,
    ).toBe(false);
  });
});
